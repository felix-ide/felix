/**
 * File component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a file in the codebase
 */
export class FileComponent extends BaseComponent {
    type = ComponentType.FILE;
    size;
    extension;
    modificationTime;
    lineCount;
    hash;
    constructor(id, name, language, filePath, location, size, extension, modificationTime, lineCount, hash, metadata = {}) {
        super(id, name, ComponentType.FILE, language, filePath, location, metadata);
        this.size = size;
        this.extension = extension;
        this.modificationTime = modificationTime;
        this.lineCount = lineCount;
        if (hash !== undefined)
            this.hash = hash;
    }
    /**
     * Create a FileComponent from file system information
     */
    static fromFileSystem(filePath, language, stats, metadata = {}) {
        const extension = filePath.split('.').pop() || '';
        const name = filePath.split('/').pop() || filePath;
        const location = {
            startLine: 1,
            endLine: stats.lineCount,
            startColumn: 1,
            endColumn: 1
        };
        const id = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new FileComponent(id, name, language, filePath, location, stats.size, extension, stats.modificationTime, stats.lineCount, stats.hash, metadata);
    }
    /**
     * Get file size in human-readable format
     */
    getFormattedSize() {
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
    isModifiedSince(timestamp) {
        return this.modificationTime > timestamp;
    }
    /**
     * Get file extension without the dot
     */
    getExtension() {
        return this.extension;
    }
    /**
     * Check if this is a specific file type
     */
    isType(extension) {
        return this.extension.toLowerCase() === extension.toLowerCase();
    }
    toJSON() {
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
    getSpecificData() {
        return {
            size: this.size,
            extension: this.extension,
            modificationTime: this.modificationTime,
            lineCount: this.lineCount,
            hash: this.hash
        };
    }
}
//# sourceMappingURL=FileComponent.js.map