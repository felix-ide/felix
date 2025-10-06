// Test file for JavaScript variable declarations and data types

// Variable declarations
var varVariable = 'var scoped';
let letVariable = 'block scoped';
const constVariable = 'cannot be reassigned';

// Primitive types
const stringType = 'string value';
const numberType = 42;
const bigIntType = 9007199254740991n;
const booleanType = true;
const nullType = null;
const undefinedType = undefined;
const symbolType = Symbol('unique');
const symbolWithDesc = Symbol.for('global symbol');

// Object types
const objectLiteral = {
  property1: 'value1',
  property2: 42,
  nested: {
    deep: 'nested value'
  }
};

const arrayLiteral = [1, 2, 3, 'mixed', true, null];
const nestedArray = [[1, 2], [3, 4], [5, 6]];

// Special number values
const infinity = Infinity;
const negInfinity = -Infinity;
const notANumber = NaN;
const maxSafeInt = Number.MAX_SAFE_INTEGER;
const minSafeInt = Number.MIN_SAFE_INTEGER;

// String templates
const template = `Template literal with ${numberType} interpolation`;
const multiline = `
  Multiline
  template
  string
`;

// Regular expressions
const simpleRegex = /pattern/gi;
const complexRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const regexConstructor = new RegExp('dynamic', 'gi');

// Dates
const currentDate = new Date();
const specificDate = new Date('2024-01-01');
const timestamp = Date.now();

// Collections
const mapCollection = new Map();
mapCollection.set('key1', 'value1');
mapCollection.set(objectLiteral, 'object as key');

const setCollection = new Set([1, 2, 3, 3, 2, 1]); // Unique values
const weakMap = new WeakMap();
const weakSet = new WeakSet();

// Typed arrays
const int8Array = new Int8Array(10);
const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
const float32Array = new Float32Array([1.1, 2.2, 3.3]);
const arrayBuffer = new ArrayBuffer(16);
const dataView = new DataView(arrayBuffer);

// Destructuring assignments
const [first, second, ...rest] = arrayLiteral;
const { property1, nested: { deep } } = objectLiteral;
const [a, , c] = [1, 2, 3]; // Skip elements

// Spread operator
const spreadArray = [...arrayLiteral, ...nestedArray];
const spreadObject = { ...objectLiteral, newProp: 'added' };

// Global objects
const globalThis = globalThis || window || global;
const jsonString = JSON.stringify(objectLiteral);
const parsed = JSON.parse(jsonString);

// Proxy and Reflect
const target = { original: 'value' };
const handler = {
  get(target, prop) {
    return `Intercepted: ${target[prop]}`;
  }
};
const proxy = new Proxy(target, handler);

// Error types
const error = new Error('Standard error');
const typeError = new TypeError('Type error');
const syntaxError = new SyntaxError('Syntax error');
const rangeError = new RangeError('Range error');
const referenceError = new ReferenceError('Reference error');

// Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('resolved'), 1000);
});

const rejectedPromise = Promise.reject('rejected');
const resolvedPromise = Promise.resolve('resolved');
const promiseAll = Promise.all([promise, resolvedPromise]);
const promiseRace = Promise.race([promise, resolvedPromise]);

// Iterators and iterables
const customIterable = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        if (i < 3) {
          return { value: i++, done: false };
        }
        return { done: true };
      }
    };
  }
};

// Object property descriptors
const descriptorObject = {};
Object.defineProperty(descriptorObject, 'readOnly', {
  value: 'cannot change',
  writable: false,
  enumerable: true,
  configurable: false
});

// Getters and setters in object literal
const getterSetterObject = {
  _internal: 42,
  
  get value() {
    return this._internal;
  },
  
  set value(newValue) {
    this._internal = newValue;
  }
};

// Computed property names
const computedKey = 'dynamic';
const computedObject = {
  [computedKey]: 'computed property',
  [`${computedKey}2`]: 'another computed'
};

// Object methods
const objectWithMethods = {
  data: 100,
  
  regularMethod() {
    return this.data;
  },
  
  arrowMethod: () => {
    return 'arrow function in object';
  }
};

// Export all variables for testing
module.exports = {
  // Primitives
  stringType,
  numberType,
  bigIntType,
  booleanType,
  nullType,
  undefinedType,
  symbolType,
  
  // Objects
  objectLiteral,
  arrayLiteral,
  nestedArray,
  
  // Collections
  mapCollection,
  setCollection,
  
  // Special values
  infinity,
  notANumber,
  
  // Functions for testing
  getCustomIterable: () => customIterable,
  getProxy: () => proxy
};