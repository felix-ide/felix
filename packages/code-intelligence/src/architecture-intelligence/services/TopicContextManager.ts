/**
 * Topic Context Manager - Advanced Multi-Topic Locking System
 * Superior to Context7 with support for multiple simultaneous topic locks
 */

// Embedding service interface for dependency injection
export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface TopicDefinition {
  id: string;
  name: string;
  keywords: string[];
  embedding: number[];
  strength: number; // 0.0-1.0, how strongly this topic is locked
  createdAt: Date;
  lastUsed: Date;
  searchCount: number;
}

export interface TopicLock {
  topicId: string;
  isActive: boolean;
  strength: number; // 0.0-1.0, lock strength
  autoDecay: boolean; // whether lock strength decays over time
  boundaryThreshold: number; // 0.0-1.0, threshold for topic drift detection
}

export interface SearchContext {
  id: string;
  query: string;
  timestamp: Date;
  detectedTopics: string[]; // topic IDs detected in this search
  activeTopics: string[]; // topic IDs that were locked during this search
  topicScores: Record<string, number>; // similarity scores for each topic
  source: 'user' | 'ai' | 'auto'; // who initiated the search
}

export interface TopicSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  activeLocks: TopicLock[];
  searchHistory: SearchContext[];
  topicGraph: Record<string, string[]>; // topic relationships
}

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] || 0) * (b[i] || 0);
    normA += (a[i] || 0) * (a[i] || 0);
    normB += (b[i] || 0) * (b[i] || 0);
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Configuration for topic context management
 */
export interface TopicManagerConfig {
  topicDetectionThreshold?: number;
  maxTopicsPerSearch?: number;
  contextFilePath?: string;
}

/**
 * Context for topic detection and drift analysis
 */
export interface TopicContext {
  currentTopics: string[];
  activeLocks: TopicLock[];
  searchHistory: SearchContext[];
  topicGraph: Record<string, string[]>;
}

/**
 * Result of topic drift detection
 */
export interface TopicDriftResult {
  hasDrift: boolean;
  driftScore: number;
  newTopics: string[];
  lostTopics: string[];
  recommendations: string[];
}

export class TopicContextManager {
  private embeddingService: IEmbeddingService;
  private projectPath: string;
  private contextFilePath: string;
  private topics: Map<string, TopicDefinition> = new Map();
  private currentSession: TopicSession | null = null;
  private config: Required<TopicManagerConfig>;

  constructor(
    projectPath: string, 
    embeddingService: IEmbeddingService,
    config: TopicManagerConfig = {}
  ) {
    this.embeddingService = embeddingService;
    this.projectPath = projectPath;
    this.config = {
      topicDetectionThreshold: 0.7,
      maxTopicsPerSearch: 5,
      contextFilePath: path.join(projectPath, '.felix.topic-context.json'),
      ...config
    };
    this.contextFilePath = this.config.contextFilePath;
  }

  /**
   * Initialize the topic context manager
   */
  async initialize(): Promise<void> {
    await this.loadPersistedState();
    this.startNewSession();
    console.error('🔒 Topic context manager initialized');
  }

  /**
   * Start a new topic session
   */
  private startNewSession(): void {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      lastActivity: new Date(),
      activeLocks: [],
      searchHistory: [],
      topicGraph: {}
    };
  }

  /**
   * Detect topics from a search query
   */
  async detectTopicsFromQuery(query: string, source: 'user' | 'ai' | 'auto' = 'user'): Promise<SearchContext> {
    if (!this.currentSession) {
      this.startNewSession();
    }

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Compare against known topics
    const topicScores: Record<string, number> = {};
    const detectedTopics: string[] = [];
    
    for (const [topicId, topic] of this.topics) {
      const similarity = cosineSimilarity(queryEmbedding, topic.embedding);
      topicScores[topicId] = similarity;
      
      if (similarity >= this.config.topicDetectionThreshold) {
        detectedTopics.push(topicId);
        // Update topic usage
        topic.lastUsed = new Date();
        topic.searchCount++;
      }
    }

    // Sort detected topics by relevance
    detectedTopics.sort((a, b) => (topicScores[b] || 0) - (topicScores[a] || 0));
    
    // Limit to max topics
    const limitedTopics = detectedTopics.slice(0, this.config.maxTopicsPerSearch);

    // Create search context
    const searchContext: SearchContext = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      timestamp: new Date(),
      detectedTopics: limitedTopics,
      activeTopics: this.currentSession?.activeLocks.map(lock => lock.topicId) || [],
      topicScores,
      source
    };

    // Add to session history
    if (this.currentSession) {
      this.currentSession.searchHistory.push(searchContext);
      this.currentSession.lastActivity = new Date();
    }

    // Auto-create topics if none detected and this is a substantial query
    if (limitedTopics.length === 0 && query.length > 10) {
      const autoTopic = await this.createTopicFromQuery(query);
      searchContext.detectedTopics = [autoTopic.id];
      searchContext.topicScores[autoTopic.id] = 1.0;
    }

    // Persist state
    await this.persistState();

    return searchContext;
  }

  /**
   * Create a new topic from a search query
   */
  async createTopicFromQuery(query: string): Promise<TopicDefinition> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Extract keywords (simple approach - could be enhanced)
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['and', 'the', 'for', 'with', 'how', 'what', 'when', 'where'].includes(word))
      .slice(0, 5);

    const topic: TopicDefinition = {
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateTopicName(query),
      keywords,
      embedding: queryEmbedding,
      strength: 0.5, // Start with medium strength
      createdAt: new Date(),
      lastUsed: new Date(),
      searchCount: 1
    };

    this.topics.set(topic.id, topic);
    console.error(`🔒 Auto-created topic: ${topic.name}`);
    
    return topic;
  }

  /**
   * Generate a topic name from a query
   */
  private generateTopicName(query: string): string {
    // Simple topic name generation - could be enhanced with NLP
    const words = query.split(/\s+/).filter(word => word.length > 3);
    if (words.length === 0) return 'Unnamed Topic';
    
    if (words.length === 1) return words[0] || 'Unnamed Topic';
    if (words.length === 2) return words.join(' ');
    
    // Take first and last meaningful words
    return `${words[0]} ... ${words[words.length - 1]}`;
  }

  /**
   * Lock a topic
   */
  async lockTopic(topicId: string, strength: number = 0.8, autoDecay: boolean = false): Promise<void> {
    if (!this.currentSession) {
      this.startNewSession();
    }

    // Remove existing lock for this topic
    if (this.currentSession) {
      this.currentSession.activeLocks = this.currentSession.activeLocks.filter(
        lock => lock.topicId !== topicId
      );

      // Add new lock
      const topicLock: TopicLock = {
        topicId,
        isActive: true,
        strength,
        autoDecay,
        boundaryThreshold: 0.3 // Default boundary threshold
      };

      this.currentSession.activeLocks.push(topicLock);
    }
    
    const topic = this.topics.get(topicId);
    console.error(`🔒 Topic locked: ${topic?.name || topicId} (strength: ${strength})`);
    
    await this.persistState();
  }

  /**
   * Unlock a topic
   */
  async unlockTopic(topicId: string): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.activeLocks = this.currentSession.activeLocks.filter(
      lock => lock.topicId !== topicId
    );

    const topic = this.topics.get(topicId);
    console.error(`🔓 Topic unlocked: ${topic?.name || topicId}`);
    
    await this.persistState();
  }

  /**
   * Check if a query would violate topic boundaries
   */
  async checkTopicBoundaries(query: string): Promise<{
    violatesLocks: boolean;
    violations: Array<{ topicId: string; topicName: string; distance: number; threshold: number }>;
    suggestions: string[];
  }> {
    if (!this.currentSession || this.currentSession.activeLocks.length === 0) {
      return { violatesLocks: false, violations: [], suggestions: [] };
    }

    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const violations: Array<{ topicId: string; topicName: string; distance: number; threshold: number }> = [];
    const suggestions: string[] = [];

    for (const lock of this.currentSession.activeLocks) {
      if (!lock.isActive) continue;

      const topic = this.topics.get(lock.topicId);
      if (!topic) continue;

      const similarity = cosineSimilarity(queryEmbedding, topic.embedding);
      const distance = 1 - similarity;

      if (distance > lock.boundaryThreshold) {
        violations.push({
          topicId: lock.topicId,
          topicName: topic.name,
          distance,
          threshold: lock.boundaryThreshold
        });

        // Generate suggestions to stay within topic
        suggestions.push(`Consider relating your query to "${topic.name}" by including terms: ${topic.keywords.slice(0, 3).join(', ')}`);
      }
    }

    return {
      violatesLocks: violations.length > 0,
      violations,
      suggestions
    };
  }

  /**
   * Get active topic locks
   */
  getActiveTopicLocks(): Array<{ topic: TopicDefinition; lock: TopicLock }> {
    if (!this.currentSession) return [];

    return this.currentSession.activeLocks
      .filter(lock => lock.isActive)
      .map(lock => ({
        topic: this.topics.get(lock.topicId)!,
        lock
      }))
      .filter(item => item.topic);
  }

  /**
   * Get topic suggestions based on current context
   */
  getTopicSuggestions(limit: number = 5): TopicDefinition[] {
    if (!this.currentSession) return [];

    // Get topics sorted by recent usage and search count
    const sortedTopics = Array.from(this.topics.values())
      .sort((a, b) => {
        const aScore = a.searchCount + (Date.now() - a.lastUsed.getTime()) / -1000000;
        const bScore = b.searchCount + (Date.now() - b.lastUsed.getTime()) / -1000000;
        return bScore - aScore;
      });

    return sortedTopics.slice(0, limit);
  }

  /**
   * Get search history for current session
   */
  getSearchHistory(limit: number = 20): SearchContext[] {
    if (!this.currentSession) return [];
    
    return this.currentSession.searchHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Clear all topic locks
   */
  async clearAllLocks(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.activeLocks = [];
    console.error('🔓 All topic locks cleared');
    
    await this.persistState();
  }

  /**
   * Persist topic context state to disk
   */
  private async persistState(): Promise<void> {
    try {
      const state = {
        topics: Array.from(this.topics.entries()).map(([topicId, topic]) => ({
          id: topicId,
          name: topic.name,
          keywords: topic.keywords,
          embedding: topic.embedding,
          strength: topic.strength,
          createdAt: topic.createdAt.toISOString(),
          lastUsed: topic.lastUsed.toISOString(),
          searchCount: topic.searchCount
        })),
        currentSession: this.currentSession ? {
          ...this.currentSession,
          startTime: this.currentSession.startTime.toISOString(),
          lastActivity: this.currentSession.lastActivity.toISOString(),
          searchHistory: this.currentSession.searchHistory.map(ctx => ({
            ...ctx,
            timestamp: ctx.timestamp.toISOString()
          }))
        } : null
      };

      await fs.writeFile(this.contextFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.warn('Failed to persist topic context state:', error);
    }
  }

  /**
   * Load persisted topic context state from disk
   */
  private async loadPersistedState(): Promise<void> {
    try {
      if (!existsSync(this.contextFilePath)) {
        return;
      }

      const data = await fs.readFile(this.contextFilePath, 'utf8');
      const state = JSON.parse(data);

      // Load topics
      if (state.topics) {
        for (const topicData of state.topics) {
          const topic: TopicDefinition = {
            ...topicData,
            createdAt: new Date(topicData.createdAt),
            lastUsed: new Date(topicData.lastUsed)
          };
          this.topics.set(topic.id, topic);
        }
      }

      // Load current session if recent (within 24 hours)
      if (state.currentSession) {
        const sessionAge = Date.now() - new Date(state.currentSession.lastActivity).getTime();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        if (sessionAge < dayInMs) {
          this.currentSession = {
            ...state.currentSession,
            startTime: new Date(state.currentSession.startTime),
            lastActivity: new Date(state.currentSession.lastActivity),
            searchHistory: state.currentSession.searchHistory.map((ctx: any) => ({
              ...ctx,
              timestamp: new Date(ctx.timestamp)
            }))
          };
        }
      }

      console.error(`🔒 Loaded ${this.topics.size} topics from persistent storage`);
    } catch (error) {
      console.warn('Failed to load persisted topic context state:', error);
    }
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    await this.persistState();
  }
}