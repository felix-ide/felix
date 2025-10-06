// Test file for TypeScript interfaces and type features

// Basic interface
interface BasicInterface {
  id: number;
  name: string;
  optional?: string;
  readonly immutable: boolean;
}

// Interface with methods
interface MethodInterface {
  calculate(a: number, b: number): number;
  async fetchData(): Promise<string>;
  optionalMethod?(): void;
}

// Interface inheritance
interface BaseInterface {
  baseProperty: string;
  baseMethod(): void;
}

interface ExtendedInterface extends BaseInterface {
  extendedProperty: number;
  extendedMethod(): string;
}

// Multiple inheritance
interface First {
  first: string;
}

interface Second {
  second: number;
}

interface Combined extends First, Second {
  combined: boolean;
}

// Generic interface
interface GenericInterface<T> {
  value: T;
  process(input: T): T;
  transform<U>(converter: (val: T) => U): U;
}

// Interface with index signatures
interface IndexSignature {
  [key: string]: any;
  [index: number]: string;
  required: boolean; // Specific property alongside index signature
}

// Function interface
interface FunctionInterface {
  (param1: string, param2: number): boolean;
  property?: string; // Function with properties
}

// Constructor interface
interface ConstructorInterface {
  new (name: string): BasicInterface;
}

// Hybrid interface (callable and constructable)
interface HybridInterface {
  (value: string): string;
  new (value: number): BasicInterface;
  staticProperty: string;
}

// Nested interfaces
interface OuterInterface {
  outer: string;
  inner: {
    nested: boolean;
    deep: {
      value: number;
    };
  };
}

// Interface merging (declaration merging)
interface MergedInterface {
  property1: string;
}

interface MergedInterface {
  property2: number;
}

// The merged interface has both properties

// Type aliases
type StringOrNumber = string | number;
type Nullable<T> = T | null;
type Callback = (data: any) => void;

// Union types
type Status = 'pending' | 'active' | 'completed' | 'cancelled';
type Result<T> = { success: true; data: T } | { success: false; error: string };

// Intersection types
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged;

// Tuple types
type Coordinate = [number, number];
type NamedTuple = [name: string, age: number, active: boolean];
type RestTuple = [string, ...number[]];

// Conditional types
type IsString<T> = T extends string ? true : false;
type ExtractArrayType<T> = T extends (infer U)[] ? U : never;

// Mapped types
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Template literal types
type EventName = `on${Capitalize<string>}`;
type Greeting = `Hello, ${string}!`;

// Utility types usage
type PartialInterface = Partial<BasicInterface>;
type ReadonlyInterface = Readonly<BasicInterface>;
type PickedInterface = Pick<BasicInterface, 'id' | 'name'>;
type OmittedInterface = Omit<BasicInterface, 'optional'>;

// Record type
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
type StatusMap = Record<Status, boolean>;

// Advanced generics
interface Container<T> {
  value: T;
}

interface ExtendedContainer<T extends { id: number }> {
  item: T;
  getId(): number;
}

// Constrained generics
function processContainer<T extends Container<any>>(container: T): T {
  return container;
}

// Infer keyword
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type FunctionReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Discriminated unions
type Circle = {
  kind: 'circle';
  radius: number;
};

type Square = {
  kind: 'square';
  size: number;
};

type Rectangle = {
  kind: 'rectangle';
  width: number;
  height: number;
};

type Shape = Circle | Square | Rectangle;

// Type guards
function isCircle(shape: Shape): shape is Circle {
  return shape.kind === 'circle';
}

// Const assertions
const literalObject = {
  prop: 'value',
  nested: {
    value: 42
  }
} as const;

type LiteralType = typeof literalObject;

// Export types and interfaces
export interface ExportedInterface {
  exported: true;
}

export type ExportedType = string | number;

export {
  BasicInterface,
  MethodInterface,
  GenericInterface,
  Shape,
  Status,
  Result
};