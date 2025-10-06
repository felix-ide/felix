// Minimal shim to let tests written for Vitest run under Jest
// Provides vi alias and common lifecycle/test globals via @jest/globals
import {
  describe,
  it,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  jest,
} from '@jest/globals';

// Re-export Jest globals as Vitest-compatible named exports
export { describe, it, test, expect, beforeAll, beforeEach, afterAll, afterEach };

// vi is an alias to jest
export const vi = jest;

// Type alias to satisfy `Mock` import from 'vitest'
export type Mock = jest.Mock;

