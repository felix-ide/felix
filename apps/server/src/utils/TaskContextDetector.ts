/**
 * Utility to detect task context (frontend/backend/full-stack) from task parameters
 */

import { CreateTaskParams, TaskContext } from '../types/WorkflowTypes.js';

export class TaskContextDetector {
  private static readonly BACKEND_KEYWORDS = [
    'api', 'backend', 'database', 'server', 'sql', 'endpoint',
    'migration', 'schema', 'query', 'model', 'controller',
    'service', 'repository', 'orm', 'rest', 'graphql',
    'authentication', 'authorization', 'middleware', 'cache',
    'redis', 'mongodb', 'postgresql', 'mysql', 'microservice'
  ];

  private static readonly FRONTEND_KEYWORDS = [
    'ui', 'component', 'styling', 'responsive', 'user interface',
    'frontend', 'react', 'vue', 'angular', 'css', 'html',
    'layout', 'design', 'mockup', 'wireframe', 'ux', 'animation',
    'client', 'browser', 'dom', 'canvas', 'button', 'form',
    'modal', 'navbar', 'sidebar', 'theme', 'tailwind', 'sass'
  ];

  private static readonly BACKEND_FILE_PATTERNS = [
    /\.py$/, /\.go$/, /\.java$/, /\.rs$/, /\.rb$/,
    /\.sql$/, /\.prisma$/, /\.graphql$/,
    /controller\./i, /service\./i, /repository\./i,
    /model\./i, /entity\./i, /schema\./i
  ];

  private static readonly FRONTEND_FILE_PATTERNS = [
    /\.tsx?$/, /\.jsx?$/, /\.vue$/, /\.svelte$/,
    /\.css$/, /\.scss$/, /\.sass$/, /\.less$/,
    /component\./i, /\.component\./i,
    /\.style\./i, /\.module\.css$/
  ];

  /**
   * Detect task context from task parameters
   */
  static detectContext(taskParams: CreateTaskParams): TaskContext {
    const detectedFrom: ('keywords' | 'files' | 'tags' | 'explicit')[] = [];
    let backendScore = 0;
    let frontendScore = 0;

    // Check explicit tags
    if (taskParams.stable_tags) {
      const tags = taskParams.stable_tags.map(t => t.toLowerCase());
      if (tags.includes('backend-only') || tags.includes('backend')) {
        backendScore += 10;
        detectedFrom.push('tags');
      }
      if (tags.includes('frontend-only') || tags.includes('frontend')) {
        frontendScore += 10;
        detectedFrom.push('tags');
      }
      if (tags.includes('full-stack')) {
        backendScore += 5;
        frontendScore += 5;
        detectedFrom.push('tags');
      }
    }

    // Check keywords in title and description
    const text = `${taskParams.title} ${taskParams.description || ''}`.toLowerCase();
    
    for (const keyword of this.BACKEND_KEYWORDS) {
      if (text.includes(keyword)) {
        backendScore += 2;
        if (!detectedFrom.includes('keywords')) {
          detectedFrom.push('keywords');
        }
      }
    }

    for (const keyword of this.FRONTEND_KEYWORDS) {
      if (text.includes(keyword)) {
        frontendScore += 2;
        if (!detectedFrom.includes('keywords')) {
          detectedFrom.push('keywords');
        }
      }
    }

    // Check entity links for file patterns
    if (taskParams.entity_links) {
      for (const link of taskParams.entity_links) {
        if (link.entity_type === 'file' || link.entity_type === 'component') {
          const fileName = link.entity_name || '';
          
          if (this.BACKEND_FILE_PATTERNS.some(pattern => pattern.test(fileName))) {
            backendScore += 3;
            if (!detectedFrom.includes('files')) {
              detectedFrom.push('files');
            }
          }
          
          if (this.FRONTEND_FILE_PATTERNS.some(pattern => pattern.test(fileName))) {
            frontendScore += 3;
            if (!detectedFrom.includes('files')) {
              detectedFrom.push('files');
            }
          }
        }
      }
    }

    // Determine context type
    let type: 'frontend' | 'backend' | 'full-stack';
    let confidence: number;

    const totalScore = backendScore + frontendScore;
    if (totalScore === 0) {
      // No clear indicators, default to full-stack
      type = 'full-stack';
      confidence = 0.3;
    } else {
      const backendRatio = backendScore / totalScore;
      const frontendRatio = frontendScore / totalScore;

      if (backendRatio > 0.7) {
        type = 'backend';
        confidence = backendRatio;
      } else if (frontendRatio > 0.7) {
        type = 'frontend';
        confidence = frontendRatio;
      } else {
        type = 'full-stack';
        confidence = 0.5 + Math.abs(backendRatio - frontendRatio);
      }
    }

    // If no detection methods were used, add 'explicit' as fallback
    if (detectedFrom.length === 0) {
      detectedFrom.push('explicit');
    }

    return {
      type,
      detected_from: detectedFrom,
      confidence
    };
  }

  /**
   * Check if a task is frontend-focused
   */
  static isFrontendTask(taskParams: CreateTaskParams): boolean {
    const context = this.detectContext(taskParams);
    return context.type === 'frontend' || 
           (context.type === 'full-stack' && context.confidence < 0.6);
  }

  /**
   * Check if a task is backend-focused
   */
  static isBackendTask(taskParams: CreateTaskParams): boolean {
    const context = this.detectContext(taskParams);
    return context.type === 'backend';
  }

  /**
   * Get context description for user feedback
   */
  static getContextDescription(context: TaskContext): string {
    const confidenceLevel = context.confidence > 0.8 ? 'high' :
                           context.confidence > 0.6 ? 'medium' : 'low';
    
    const detectionMethods = context.detected_from.join(', ');
    
    return `Detected as ${context.type} task with ${confidenceLevel} confidence (based on ${detectionMethods})`;
  }

  /**
   * Get workflow requirement adjustments based on context
   */
  static getWorkflowAdjustments(context: TaskContext): {
    skipMockups: boolean;
    skipUITests: boolean;
    requireAPITests: boolean;
    requirePerformanceTests: boolean;
    message: string;
  } {
    switch (context.type) {
      case 'backend':
        return {
          skipMockups: true,
          skipUITests: true,
          requireAPITests: true,
          requirePerformanceTests: true,
          message: 'Backend task detected - UI mockups not required, API tests emphasized'
        };
      
      case 'frontend':
        return {
          skipMockups: false,
          skipUITests: false,
          requireAPITests: false,
          requirePerformanceTests: false,
          message: 'Frontend task detected - UI mockups and visual tests required'
        };
      
      case 'full-stack':
      default:
        return {
          skipMockups: false,
          skipUITests: false,
          requireAPITests: true,
          requirePerformanceTests: true,
          message: 'Full-stack task detected - all requirements apply'
        };
    }
  }
}