import { IComponent, ITask, INote, IRule } from '@felix/code-intelligence';

/**
 * Text converter function type
 * Converts an entity to text for embedding generation
 */
export type TextConverter<T> = (entity: T) => string;

/**
 * Text converters for different entity types
 * Following Single Responsibility Principle - each converter handles one entity type
 */
export class TextConverters {
  /**
   * Convert component to searchable text
   * Includes: name, type, language, documentation, and code snippet
   */
  static component(component: IComponent): string {
    // Try to include leading docblock and signature-like hints when available
    const code = (component.code && typeof component.code === 'string') ? component.code : '';
    const docblockMatch = code.match(/\/\*\*[\s\S]*?\*\//);
    const docblock = docblockMatch ? docblockMatch[0].slice(0, 500) : '';
    const signatureHints = [component.name, component.type, component.language]
      .filter(Boolean)
      .join(' ');
    const parts = [
      signatureHints,
      component.metadata?.description || '',
      component.metadata?.documentation || '',
      docblock,
      // include first 300 chars of code for grounding
      code ? code.substring(0, 300) : ''
    ];
    
    return TextConverters.normalize(parts.filter(Boolean).join(' '));
  }

  /**
   * Convert task to searchable text
   * Includes: title, type, status, priority, description, assignee, and tags
   */
  static task(task: ITask): string {
    const parts = [
      task.title,
      task.task_type,
      task.task_status,
      task.task_priority,
      task.description || '',
      task.assigned_to || '',
      task.tags?.stable_tags?.join(' ') || ''
    ];

    return TextConverters.normalize(parts.filter(Boolean).join(' '));
  }

  /**
   * Convert note to searchable text
   * Includes: title, type, content snippet, linked entities, and tags
   */
  static note(note: INote): string {
    const parts = [
      note.title || '',
      note.note_type,
      // Include only first 1000 chars of content to avoid huge embeddings
      note.content ? note.content.substring(0, 1000) : '',
      note.entity_links?.map(link => `${link.entity_type}:${link.entity_id}`).join(' ') || '',
      note.tags?.stable_tags?.join(' ') || ''
    ];

    return TextConverters.normalize(parts.filter(Boolean).join(' '));
  }

  /**
   * Convert rule to searchable text
   * Includes: name, type, description, guidance, and template snippet
   */
  static rule(rule: IRule): string {
    const parts = [
      rule.name,
      rule.rule_type,
      rule.description || '',
      rule.guidance_text,
      // Include only first 500 chars of template to avoid huge embeddings
      rule.code_template ? rule.code_template.substring(0, 500) : '',
      rule.validation_script ? rule.validation_script.substring(0, 200) : ''
    ];

    return TextConverters.normalize(parts.filter(Boolean).join(' '));
  }

  /**
   * Generic text normalization for any string
   * Removes excessive whitespace and trims
   */
  static normalize(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // Normalize Windows line endings
      .replace(/\r/g, '\n')    // Normalize old Mac line endings
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .replace(/\n+/g, ' ')    // Replace newlines with space
      .trim();
  }

  /**
   * Extract keywords from text for better search
   * Returns unique words longer than 2 characters
   */
  static extractKeywords(text: string): string[] {
    const normalized = TextConverters.normalize(text.toLowerCase());
    const words = normalized.split(/\s+/);
    const uniqueWords = new Set(
      words.filter(word => word.length > 2 && !STOP_WORDS.has(word))
    );
    return Array.from(uniqueWords);
  }
}

/**
 * Common stop words to filter out from keyword extraction
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
  'can', 'had', 'her', 'was', 'one', 'our', 'out', 'his',
  'has', 'had', 'how', 'its', 'may', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'boy', 'did', 'get', 'got',
  'him', 'let', 'put', 'say', 'she', 'too', 'use', 'that',
  'with', 'have', 'this', 'will', 'your', 'from', 'they',
  'know', 'want', 'been', 'good', 'much', 'some', 'time'
]);
