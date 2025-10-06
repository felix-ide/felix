export interface FileIndexingOptions {
  maxFileSize?: number;
  excludeDirectories?: string[];
  includeDirectories?: string[];
  followSymlinks?: boolean;
  excludeExtensions?: string[];
  includeExtensions?: string[];
}

export interface IndexingResult {
  success: boolean;
  filesProcessed: number;
  componentCount: number;
  relationshipCount: number;
  errors: Array<{ filePath: string; error: string }>;
  warnings: Array<{ filePath: string; message: string }>;
  processingTime: number;
  startedAt?: string;
  endedAt?: string;
}

export interface FileIndexingResult {
  success: boolean;
  filePath: string;
  components: any[];
  relationships: any[];
  errors: Array<{ line: number; column: number; message: string; severity: string }>;
  language: string;
  processingTime: number;
}

export interface DiscoveryOptions {
  includeTests?: boolean;
  filePattern?: string;
}
