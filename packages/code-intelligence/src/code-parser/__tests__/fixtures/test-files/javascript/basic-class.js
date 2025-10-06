/**
 * Basic class example for testing
 */
class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push({ operation: 'add', a, b, result });
    return result;
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push({ operation: 'subtract', a, b, result });
    return result;
  }

  getHistory() {
    return this.history;
  }

  static create() {
    return new Calculator();
  }
}

export default Calculator;