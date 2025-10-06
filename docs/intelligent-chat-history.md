# Intelligent Chat History System

## Overview

Instead of sending thousands of tokens of raw conversation history to AI models, this system provides:
1. **Recent raw messages** for immediate context
2. **Hierarchical conversation summaries** at different compression levels
3. **MCP tools** for intelligent historical context retrieval
4. **Background compression pipeline** that continuously optimizes conversations

## Architecture

### Storage Strategy

```
Raw Conversations (SQLite) → Background Processing → Hierarchical Summaries + S3 Archive
```

**Local Database (SQLite):**
- Recent conversations (full detail)
- Hierarchical summaries with embeddings
- Metadata and cross-references

**Cold Storage (S3):**
- Complete conversation archives
- Referenced by pointers in local DB

### Compression Levels

| Level | Compression | Use Case | Token Budget |
|-------|-------------|----------|--------------|
| 0 | Raw (S3) | Complete archive | Original size |
| 1 | 50% | Recent detailed context | ~4k tokens |
| 2 | 80% | Topic summaries | ~1k tokens |
| 3 | 95% | Session summaries | ~250 tokens |
| 4 | 99% | Multi-session themes | ~50 tokens |

## Background Processing Pipeline

### Compression Triggers
```typescript
// Monitor conversation length
if (conversation.token_count > COMPRESSION_THRESHOLD) {
  scheduleCompressionJob(conversation.id, targetLevel);
}

// Example thresholds:
// 8k tokens → Level 1 (4k)
// 4k tokens → Level 2 (1k)  
// 1k tokens → Level 3 (250)
// 250 tokens → Level 4 (50)
```

### Background Workers
- **Compression Daemon**: Monitors DB, triggers summarization jobs
- **Embedding Generator**: Creates semantic vectors for all summaries
- **S3 Archiver**: Moves old raw conversations to cold storage
- **Context Optimizer**: Pre-computes common context combinations

### Database Schema
```sql
-- Raw conversations
conversations (
  id, session_id, full_content, token_count, 
  status, created_at, archived_to_s3
)

-- Hierarchical summaries
conversation_summaries (
  id, conversation_id, compression_level,
  content, token_count, embedding,
  topics, s3_pointer, created_at
)

-- Cross-references for context reconstruction
summary_links (
  parent_summary_id, child_summary_id, 
  relationship_type, relevance_score
)

-- Session metadata
conversation_sessions (
  id, project_id, total_messages, 
  primary_topics, agent_chains_used,
  created_at, last_active
)
```

## MCP Interface

### Context Payload to AI
Instead of massive chat dumps, send:

```json
{
  "recent_messages": [
    // Last 5-10 raw messages for immediate context
  ],
  "conversation_index": {
    "session_id": "abc123",
    "total_messages": 847,
    "available_summaries": [
      {
        "level": 1,
        "token_count": 2300,
        "topics": ["code review", "bug fixes", "testing"],
        "time_range": "last 2 hours"
      },
      {
        "level": 2, 
        "token_count": 580,
        "topics": ["project setup", "architecture decisions"],
        "time_range": "earlier today"
      },
      {
        "level": 3,
        "token_count": 120,
        "topics": ["initial planning", "requirements"],
        "time_range": "yesterday"
      }
    ],
    "related_sessions": [
      {"id": "def456", "topic": "similar bug fixes", "relevance": 0.8}
    ]
  }
}
```

### MCP Tools

#### `get_conversation_summary`
```typescript
{
  name: "get_conversation_summary",
  description: "Retrieve compressed conversation history at specified detail level",
  parameters: {
    level: number,           // 1-4 compression level
    topic_filter?: string,   // Optional topic filtering
    max_tokens?: number,     // Token budget constraint
    time_range?: string      // "recent", "today", "this_week", etc.
  }
}
```

#### `search_conversation_history`
```typescript
{
  name: "search_conversation_history", 
  description: "Semantic search through conversation history",
  parameters: {
    query: string,           // Natural language search query
    max_results?: number,    // Limit number of results
    max_tokens?: number,     // Total token budget for results
    exclude_recent?: boolean // Skip recent messages already in context
  }
}
```

#### `get_related_conversations`
```typescript
{
  name: "get_related_conversations",
  description: "Find conversations from other sessions related to current topic",
  parameters: {
    topic: string,           // Topic or concept to find
    max_sessions?: number,   // Limit cross-session results
    min_relevance?: number   // Minimum relevance score (0-1)
  }
}
```

#### `get_conversation_context`
```typescript
{
  name: "get_conversation_context",
  description: "Get detailed context around a specific message or time",
  parameters: {
    message_id?: string,     // Specific message ID
    timestamp?: string,      // Or timestamp
    surrounding_count: number, // Messages before/after to include
    include_summaries?: boolean // Include relevant summaries
  }
}
```

## AI Instructions Template

```
You have access to conversation history through MCP tools. You receive:

1. **recent_messages**: Last few messages for immediate context
2. **conversation_index**: Overview of available historical context
3. **Tools**: Use selectively to retrieve relevant past context

**Guidelines:**
- Only retrieve historical context when needed for your response
- Choose appropriate compression level based on relevance needs
- Be token-conscious - each tool call costs context budget
- Prefer semantic search over level-by-level browsing
- Use related_conversations for cross-session insights

**Tool Usage Patterns:**
- Quick background: `get_conversation_summary(level: 3)`
- Specific topic deep-dive: `search_conversation_history(query: "specific topic")`
- Cross-session patterns: `get_related_conversations(topic: "current issue")`
- Message context: `get_conversation_context(message_id: "msg_123")`
```

## Implementation Strategy

### Phase 1: Basic Compression
- Implement background compression daemon
- Create basic MCP tools for summary retrieval
- Simple hierarchical summaries (levels 1-3)

### Phase 2: Semantic Enhancement  
- Add embedding generation for summaries
- Implement semantic search capabilities
- Cross-conversation relationship detection

### Phase 3: Intelligence Layer
- Context optimization and pre-computation
- Smart compression triggers based on content analysis
- Agent-specific context formatting

### Phase 4: Advanced Features
- Multi-project conversation relationships
- Code context integration (link with code indexer)
- Predictive context loading

## Benefits

### For AI Models
- **Efficient token usage**: Only load relevant historical context
- **Better decision making**: AI chooses what context it needs
- **Scalable**: Works with conversations of any length
- **Intelligent**: Semantic search finds truly relevant past context

### For IDE Application
- **Fast response times**: No massive context loading
- **Cost effective**: Reduced token usage = lower API costs
- **Scalable storage**: Raw data in cheap S3, summaries local
- **Cross-session insights**: Find patterns across multiple conversations

### For Developers
- **Transparent**: Clear what historical context AI is using
- **Configurable**: Adjust compression levels and retrieval strategies
- **Debuggable**: Track which historical context influenced responses
- **Extensible**: Easy to add new compression strategies or MCP tools

## Technical Considerations

### Model Requirements
- **Summarization**: Phi-3.5-mini (3.8B) for quality compression
- **Embeddings**: MiniLM-L6-v2 (existing) for semantic search
- **Real-time**: No real-time models needed - all background processing

### Performance
- **Background processing**: No impact on chat responsiveness
- **Local DB**: Fast retrieval of summaries and metadata
- **S3 integration**: Async archival, rare full retrieval
- **Embedding search**: Sub-100ms semantic queries

### Storage Estimates
- **Raw conversations**: ~1-2KB per message
- **Level 1 summaries**: ~50% of original
- **Level 3 summaries**: ~5% of original  
- **Embeddings**: 384 floats per summary (~1.5KB)
- **S3 costs**: Minimal for cold storage

This system transforms conversation history from a **token dump problem** into an **intelligent context retrieval system**, making AI interactions more efficient and contextually aware while scaling to unlimited conversation lengths.