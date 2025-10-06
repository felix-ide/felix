/**
 * Excalidraw Format Validator and Processor
 * 
 * Handles validation and processing of Excalidraw diagrams for the notes system
 */

export interface ExcalidrawData {
  type: string;
  version: number;
  source: string;
  elements: any[];
  appState: any;
  files?: any;
}

/**
 * Validates if content is valid Excalidraw JSON
 */
export function isValidExcalidrawJSON(content: string): boolean {
  try {
    const data = JSON.parse(content);
    return (
      data &&
      typeof data === 'object' &&
      data.type === 'excalidraw' &&
      typeof data.version === 'number' &&
      Array.isArray(data.elements)
    );
  } catch {
    return false;
  }
}

/**
 * Extracts Excalidraw JSON from markdown code blocks
 * Supports both ```excalidraw and ```json blocks
 */
export function extractExcalidrawFromMarkdown(content: string): string | null {
  // Try to match excalidraw code block
  const excalidrawMatch = content.match(/```excalidraw\s*\n([\s\S]*?)\n```/);
  if (excalidrawMatch && excalidrawMatch[1]) {
    const extracted = excalidrawMatch[1].trim();
    if (isValidExcalidrawJSON(extracted)) {
      return extracted;
    }
  }

  // Try to match json code block that contains excalidraw data
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    const extracted = jsonMatch[1].trim();
    if (isValidExcalidrawJSON(extracted)) {
      return extracted;
    }
  }

  // Try raw content as JSON
  if (isValidExcalidrawJSON(content)) {
    return content;
  }

  return null;
}

/**
 * Process Excalidraw content for storage
 * Handles various input formats and normalizes them
 */
export function processExcalidrawContent(content: string, noteType: string): {
  processedContent: string;
  isValid: boolean;
  error?: string;
} {
  // For excalidraw note type, validate and process the content
  if (noteType === 'excalidraw') {
    // Try to extract valid Excalidraw JSON
    const extractedJSON = extractExcalidrawFromMarkdown(content);
    
    if (extractedJSON) {
      return {
        processedContent: extractedJSON,
        isValid: true
      };
    } else {
      // If we can't extract valid JSON, check if it's a markdown note with excalidraw blocks
      if (content.includes('```excalidraw') || content.includes('```json')) {
        return {
          processedContent: content,
          isValid: false,
          error: 'Invalid Excalidraw JSON format in code block. Ensure the JSON is valid and contains required fields: type, version, elements.'
        };
      }
      
      // For pure JSON content, provide helpful error
      return {
        processedContent: content,
        isValid: false,
        error: 'Invalid Excalidraw format. Content must be valid JSON with type="excalidraw", version, and elements array.'
      };
    }
  }
  
  // For other note types, just return as-is
  return {
    processedContent: content,
    isValid: true
  };
}

/**
 * Creates a basic Excalidraw template
 */
export function createExcalidrawTemplate(title?: string): ExcalidrawData {
  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: [],
    appState: {
      gridSize: null,
      viewBackgroundColor: "#ffffff"
    },
    files: {}
  };
}

/**
 * Wraps Excalidraw JSON in markdown code block for display
 */
export function wrapExcalidrawInMarkdown(excalidrawData: string | ExcalidrawData): string {
  const jsonString = typeof excalidrawData === 'string' 
    ? excalidrawData 
    : JSON.stringify(excalidrawData, null, 2);
    
  return `\`\`\`excalidraw
${jsonString}
\`\`\``;
}