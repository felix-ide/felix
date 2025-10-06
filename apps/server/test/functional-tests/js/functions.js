// Test file for JavaScript function features

// Regular function declaration
function regularFunction(param1, param2) {
  return param1 + param2;
}

// Function expression
const functionExpression = function(x) {
  return x * 2;
};

// Named function expression
const namedExpression = function innerName(n) {
  if (n <= 1) return 1;
  return n * innerName(n - 1);
};

// Arrow functions
const arrowFunction = (a, b) => a + b;
const singleParamArrow = x => x * 2;
const noParamArrow = () => 'no params';
const blockArrow = (x) => {
  const doubled = x * 2;
  return doubled + 1;
};

// Async functions
async function asyncFunction(url) {
  const response = await fetch(url);
  return response.json();
}

const asyncArrow = async (id) => {
  return await database.find(id);
};

// Generator functions
function* generatorFunction() {
  yield 1;
  yield 2;
  yield 3;
}

const generatorExpression = function*() {
  let i = 0;
  while (i < 10) {
    yield i++;
  }
};

// Async generator functions
async function* asyncGenerator() {
  yield await Promise.resolve(1);
  yield await Promise.resolve(2);
  yield await Promise.resolve(3);
}

// Default parameters
function defaultParams(a = 1, b = 2, c = a + b) {
  return c;
}

// Rest parameters
function restParams(first, ...rest) {
  return rest.reduce((sum, val) => sum + val, first);
}

// Destructuring parameters
function destructuringParams({ name, age }, [first, second]) {
  return `${name} is ${age}, values: ${first}, ${second}`;
}

// Higher-order functions
function higherOrder(fn) {
  return function(...args) {
    console.log('Before calling function');
    const result = fn(...args);
    console.log('After calling function');
    return result;
  };
}

// Currying
function curry(a) {
  return function(b) {
    return function(c) {
      return a + b + c;
    };
  };
}

const curriedArrow = a => b => c => a + b + c;

// Immediately invoked function expression (IIFE)
(function() {
  console.log('IIFE executed');
})();

const iiffeResult = (function(x) {
  return x * 2;
})(5);

// Function with closure
function createCounter(initial = 0) {
  let count = initial;
  
  return {
    increment() {
      return ++count;
    },
    decrement() {
      return --count;
    },
    getCount() {
      return count;
    }
  };
}

// Recursive function
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Function with memoization
function memoize(fn) {
  const cache = new Map();
  
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Tagged template literal function
function taggedTemplate(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] || '');
  }, '');
}

const tagged = taggedTemplate`Hello ${'world'} from ${'JavaScript'}`;

// Function constructor (rare usage)
const constructedFunction = new Function('a', 'b', 'return a + b');

// Method definitions in object
const objectWithMethods = {
  method1() {
    return 'method1';
  },
  
  async asyncMethod() {
    return await Promise.resolve('async');
  },
  
  *generatorMethod() {
    yield 'generator';
  },
  
  get getter() {
    return 'getter value';
  },
  
  set setter(value) {
    this._value = value;
  },
  
  ['computed' + 'Method']() {
    return 'computed method name';
  }
};

// Export functions
exports.regularFunction = regularFunction;
exports.functionExpression = functionExpression;
exports.arrowFunction = arrowFunction;
exports.asyncFunction = asyncFunction;
exports.generatorFunction = generatorFunction;
exports.createCounter = createCounter;
exports.memoize = memoize;
exports.curry = curry;
exports.higherOrder = higherOrder;