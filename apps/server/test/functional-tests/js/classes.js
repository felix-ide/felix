// Test file for JavaScript class features

// Basic class with constructor
class BasicClass {
  constructor(name) {
    this.name = name;
    this.created = new Date();
  }

  getName() {
    return this.name;
  }
}

// Class with static methods and properties
class StaticClass {
  static staticProperty = 'static value';
  static staticMethod() {
    return 'static method result';
  }

  instanceMethod() {
    return 'instance method result';
  }
}

// Class with getters and setters
class GetterSetterClass {
  #privateField = 'private';

  get value() {
    return this.#privateField;
  }

  set value(newValue) {
    this.#privateField = newValue;
  }

  get computed() {
    return `Computed: ${this.#privateField}`;
  }
}

// Class inheritance
class BaseClass {
  constructor(id) {
    this.id = id;
  }

  baseMethod() {
    return 'base';
  }

  overriddenMethod() {
    return 'base version';
  }
}

class DerivedClass extends BaseClass {
  constructor(id, extra) {
    super(id);
    this.extra = extra;
  }

  derivedMethod() {
    return 'derived';
  }

  overriddenMethod() {
    return 'derived version';
  }

  callSuper() {
    return super.overriddenMethod();
  }
}

// Class with private fields and methods
class PrivateClass {
  #privateField = 42;
  #privateMethod() {
    return this.#privateField * 2;
  }

  publicMethod() {
    return this.#privateMethod();
  }
}

// Class with async methods
class AsyncClass {
  async fetchData() {
    return new Promise(resolve => {
      setTimeout(() => resolve('data'), 100);
    });
  }

  async *asyncGenerator() {
    yield 1;
    yield 2;
    yield 3;
  }
}

// Class with generator methods
class GeneratorClass {
  *generator() {
    yield 'first';
    yield 'second';
    yield 'third';
  }

  *infiniteGenerator() {
    let i = 0;
    while (true) {
      yield i++;
    }
  }
}

// Abstract-like class pattern
class AbstractBase {
  constructor() {
    if (new.target === AbstractBase) {
      throw new Error('Cannot instantiate abstract class');
    }
  }

  abstractMethod() {
    throw new Error('Must implement abstract method');
  }

  concreteMethod() {
    return 'concrete implementation';
  }
}

// Mixin pattern
const TimestampMixin = {
  getTimestamp() {
    return Date.now();
  },
  
  setTimestamp() {
    this.timestamp = Date.now();
  }
};

const SerializableMixin = {
  serialize() {
    return JSON.stringify(this);
  }
};

class MixedClass {
  constructor(data) {
    this.data = data;
  }
}

Object.assign(MixedClass.prototype, TimestampMixin, SerializableMixin);

// Export variations
module.exports = {
  BasicClass,
  StaticClass,
  GetterSetterClass,
  BaseClass,
  DerivedClass,
  PrivateClass,
  AsyncClass,
  GeneratorClass,
  AbstractBase,
  MixedClass
};

// Named exports
module.exports.default = BasicClass;
module.exports.namedExport = StaticClass;