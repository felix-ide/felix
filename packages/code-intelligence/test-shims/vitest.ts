// Vitest shim for running tests under Jest
import {
  describe,
  it,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  jest as jestGlobals,
} from '@jest/globals';

export { describe, it, test, expect, beforeAll, beforeEach, afterAll, afterEach };

export type Mock = jest.Mock;

export const vi = {
  fn: jestGlobals.fn,
  spyOn: jestGlobals.spyOn,
  mock: jestGlobals.mock,
  mocked: <T>(item: T): jest.Mocked<T> => item as unknown as jest.Mocked<T>,
  clearAllMocks: jestGlobals.clearAllMocks,
  resetAllMocks: jestGlobals.resetAllMocks,
  restoreAllMocks: jestGlobals.restoreAllMocks,
};

