// Test file for TypeScript class features

import { BasicInterface, MethodInterface } from './interfaces';

// Basic class with types
class TypedClass {
  public publicProperty: string = 'public';
  private privateProperty: number = 42;
  protected protectedProperty: boolean = true;
  readonly readonlyProperty: string = 'immutable';
  
  constructor(public constructorParam: string, private privateParam: number) {
    // Parameter properties
  }
  
  public publicMethod(): string {
    return this.publicProperty;
  }
  
  private privateMethod(): number {
    return this.privateProperty;
  }
  
  protected protectedMethod(): boolean {
    return this.protectedProperty;
  }
}

// Class implementing interface
class InterfaceImplementation implements BasicInterface, MethodInterface {
  id: number;
  name: string;
  optional?: string;
  readonly immutable: boolean = true;
  
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
  
  calculate(a: number, b: number): number {
    return a + b;
  }
  
  async fetchData(): Promise<string> {
    return Promise.resolve('data');
  }
}

// Abstract class
abstract class AbstractClass {
  abstract abstractProperty: string;
  abstract abstractMethod(): void;
  
  concreteProperty: number = 100;
  
  concreteMethod(): string {
    return 'concrete implementation';
  }
  
  protected abstract protectedAbstract(): boolean;
}

// Concrete implementation
class ConcreteClass extends AbstractClass {
  abstractProperty: string = 'implemented';
  
  abstractMethod(): void {
    console.log('Abstract method implemented');
  }
  
  protected protectedAbstract(): boolean {
    return true;
  }
}

// Generic class
class GenericClass<T> {
  private value: T;
  
  constructor(value: T) {
    this.value = value;
  }
  
  getValue(): T {
    return this.value;
  }
  
  setValue(value: T): void {
    this.value = value;
  }
  
  map<U>(mapper: (val: T) => U): U {
    return mapper(this.value);
  }
}

// Constrained generic class
class ConstrainedGeneric<T extends { id: number }> {
  constructor(private item: T) {}
  
  getId(): number {
    return this.item.id;
  }
}

// Class with decorators (when enabled)
function ClassDecorator(constructor: Function) {
  console.log('Class decorated');
}

function MethodDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  console.log('Method decorated');
}

function PropertyDecorator(target: any, propertyKey: string) {
  console.log('Property decorated');
}

@ClassDecorator
class DecoratedClass {
  @PropertyDecorator
  decoratedProperty: string = 'decorated';
  
  @MethodDecorator
  decoratedMethod(): void {
    console.log('Decorated method called');
  }
}

// Static members and methods
class StaticClass {
  static staticProperty: string = 'static';
  static readonly constantProperty: number = 42;
  
  static staticMethod(): string {
    return StaticClass.staticProperty;
  }
  
  static {
    // Static initialization block
    console.log('Static block executed');
  }
}

// Class with getters and setters
class GetterSetterClass {
  private _value: number = 0;
  
  get value(): number {
    return this._value;
  }
  
  set value(newValue: number) {
    if (newValue >= 0) {
      this._value = newValue;
    }
  }
  
  get computed(): string {
    return `Value is ${this._value}`;
  }
}

// Singleton pattern
class Singleton {
  private static instance: Singleton;
  
  private constructor() {}
  
  static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}

// Mixin pattern
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now();
    
    getTimestamp() {
      return this.timestamp;
    }
  };
}

function Tagged<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    tags: string[] = [];
    
    addTag(tag: string) {
      this.tags.push(tag);
    }
  };
}

class BasicClass {
  name: string = 'basic';
}

// Apply mixins
const MixedClass = Tagged(Timestamped(BasicClass));
const mixedInstance = new MixedClass();

// Class expressions
const ClassExpression = class {
  method() {
    return 'class expression';
  }
};

const NamedClassExpression = class InternalName {
  static getClassName() {
    return InternalName.name;
  }
};

// Namespace with class
namespace ClassNamespace {
  export class NamespacedClass {
    namespaceMethod(): string {
      return 'from namespace';
    }
  }
  
  export interface NamespaceInterface {
    property: string;
  }
}

// Module augmentation
declare module './interfaces' {
  interface BasicInterface {
    augmentedProperty?: string;
  }
}

// Class with overloaded methods
class OverloadedClass {
  process(value: string): string;
  process(value: number): number;
  process(value: string | number): string | number {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value * 2;
  }
}

// Export classes
export {
  TypedClass,
  InterfaceImplementation,
  AbstractClass,
  ConcreteClass,
  GenericClass,
  DecoratedClass,
  Singleton,
  ClassNamespace
};

export default TypedClass;