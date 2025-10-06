import '@testing-library/jest-dom';
import React from 'react';

// Mock mermaid
jest.mock('mermaid', () => ({
  initialize: jest.fn(),
  render: jest.fn().mockResolvedValue({ svg: '<svg>Mock Mermaid Diagram</svg>' }),
}));

// Mock Excalidraw (avoid JSX in .ts by using TSX file)
jest.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: jest.fn((props: any) => (
    <div
      data-testid="excalidraw-mock"
      viewModeEnabled={String(props.viewModeEnabled)}
      zenModeEnabled={String(props.zenModeEnabled)}
      gridModeEnabled={String(props.gridModeEnabled)}
      theme={props.theme}
    >
      {props.children}
    </div>
  )),
}));

// Suppress noisy console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
