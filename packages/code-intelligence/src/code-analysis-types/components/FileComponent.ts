/**
 * File component implementation
 */

import { IFileComponent, Location, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';

/**
 * Represents a file in the codebase
 */
export class FileComponent extends BaseComponent implements IFileComponent {
  public readonly type = ComponentType.FILE;
  public readonly size: number;
  public readonly extension: string;
  public readonly modificationTime: number;
  public readonly lineCount: number;
  public readonly hash?: string;

  constructor(
    id: string,
    name: string,
    language: string,
    filePath: string,
    location: Location,
    size: number,
    extension: string,
    modificationTime: number,
    lineCount: number,
    hash?: string,
    metadata: Record<string, any> = {}
  ) {
    super(id, name, ComponentType.FILE, language, filePath, location, metadata);
    this.size = size;
    this.extension = extension;
    this.modificationTime = modificationTime;
    this.lineCount = lineCount;
    if (hash !== undefined) this.hash = hash;
  }

  /**
   * Create a FileComponent from file system information
   */
  static fromFileSystem(
    filePath: string,
    language: string,
    stats: {
      size: number;
      modificationTime: number;
      lineCount: number;
      hash?: string;
    },
    metadata: Record<string, any> = {}
  ): FileComponent {
    const extension = filePath.split('.').pop() || '';
    const name = filePath.split('/').pop() || filePath;
    const location: Location = {
      startLine: 1,
      endLine: stats.lineCount,
      startColumn: 1,
      endColumn: 1
    };
    
    const id = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    return new FileComponent(
      id,
      name,
      language,
      filePath,
      location,
      stats.size,
      extension,
      stats.modificationTime,
      stats.lineCount,
      stats.hash,
      metadata
    );
  }

  /**
   * Get file size in human-readable format
   */
  getFormattedSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if file has been modified since a given timestamp
   */
  isModifiedSince(timestamp: number): boolean {
    return this.modificationTime > timestamp;
  }

  /**
   * Get file extension without the dot
   */
  getExtension(): string {
    return this.extension;
  }

  /**
   * Check if this is a specific file type
   */
  isType(extension: string): boolean {
    return this.extension.toLowerCase() === extension.toLowerCase();
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      size: this.size,
      extension: this.extension,
      modificationTime: this.modificationTime,
      lineCount: this.lineCount,
      hash: this.hash
    };
  }

  /**
   * Get component-specific data
   */
  public getSpecificData(): Record<string, any> {
    return {
      size: this.size,
      extension: this.extension,
      modificationTime: this.modificationTime,
      lineCount: this.lineCount,
      hash: this.hash
    };
  }
}