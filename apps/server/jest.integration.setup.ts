// Setup for integration tests
import 'reflect-metadata'; // Required for TypeORM decorators

// Avoid TS errors if Jest types aren’t picked up by ts-jest for this setup file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const jest: any;

// Increase timeout for integration tests when available
try { if (typeof jest !== 'undefined' && jest?.setTimeout) { jest.setTimeout(30000); } } catch {}

// Silence console during tests unless DEBUG is set
if (!process.env.DEBUG) {
  const noop = () => {};
  const f = (typeof jest !== 'undefined' && jest?.fn) ? jest.fn : () => noop;
  // Override console for tests (types vary in setup files)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).console = {
    ...console,
    log: f(),
    debug: f(),
    info: f(),
    warn: f(),
    // Keep error for debugging
    error: console.error,
  };
}
