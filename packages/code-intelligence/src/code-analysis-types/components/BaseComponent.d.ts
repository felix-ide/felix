/**
 * Base class for all component types
 */
import { ComponentType, Location } from '../entities/core-types.js';
export declare abstract class BaseComponent {
    readonly id: string;
    readonly name: string;
    readonly type: ComponentType;
    readonly language: string;
    readonly filePath: string;
    readonly location: Location;
    readonly metadata: Record<string, any>;
    constructor(id: string, name: string, type: ComponentType, language: string, filePath: string, location: Location, metadata?: Record<string, any>);
    /**
     * Clone the component with optional overrides
     */
    clone(overrides?: Partial<BaseComponent>): BaseComponent;
    /**
     * Get component-specific data (to be implemented by subclasses)
     */
    abstract getSpecificData(): Record<string, any>;
    /**
     * Convert to plain object
     */
    toJSON(): Record<string, any>;
    /**
     * Convert to string representation
     */
    toString(): string;
}
//# sourceMappingURL=BaseComponent.d.ts.map