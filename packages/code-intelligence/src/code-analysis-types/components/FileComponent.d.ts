/**
 * File component implementation
 */
import { IFileComponent, Location, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a file in the codebase
 */
export declare class FileComponent extends BaseComponent implements IFileComponent {
    readonly type = ComponentType.FILE;
    readonly size: number;
    readonly extension: string;
    readonly modificationTime: number;
    readonly lineCount: number;
    readonly hash?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, size: number, extension: string, modificationTime: number, lineCount: number, hash?: string, metadata?: Record<string, any>);
    /**
     * Create a FileComponent from file system information
     */
    static fromFileSystem(filePath: string, language: string, stats: {
        size: number;
        modificationTime: number;
        lineCount: number;
        hash?: string;
    }, metadata?: Record<string, any>): FileComponent;
    /**
     * Get file size in human-readable format
     */
    getFormattedSize(): string;
    /**
     * Check if file has been modified since a given timestamp
     */
    isModifiedSince(timestamp: number): boolean;
    /**
     * Get file extension without the dot
     */
    getExtension(): string;
    /**
     * Check if this is a specific file type
     */
    isType(extension: string): boolean;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
//# sourceMappingURL=FileComponent.d.ts.map