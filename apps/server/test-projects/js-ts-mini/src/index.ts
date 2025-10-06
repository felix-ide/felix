import { add } from './util.js';

export class Calculator {
  sum(numbers: number[]): number {
    return numbers.reduce((acc, n) => add(acc, n), 0);
  }
}

export function main() {
  const c = new Calculator();
  return c.sum([1, 2, 3]);
}

