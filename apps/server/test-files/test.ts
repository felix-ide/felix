/**
 * Test TypeScript file for parser validation
 * Expected components:
 * - 1 file component
 * - 1 class (TestClass)
 * - 1 interface (TestInterface)
 * - 1 constructor
 * - 2 methods (method, interfaceMethod)
 * - 1 property (property)
 * 
 * Expected relationships:
 * - file-contains-class
 * - file-contains-interface
 * - class-contains-method (constructor, method)
 * - class-contains-property
 * - interface-contains-method
 */

export class TestClass {
  private property: string = "test";
  
  constructor(value: string) {
    this.property = value;
  }
  
  public method(): string {
    return this.property;
  }
}

export interface TestInterface {
  prop: string;
  interfaceMethod(): void;
}