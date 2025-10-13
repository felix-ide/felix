import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/ExtendedMarkdownRenderer.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: !options.watch, // Only clean on non-watch builds
  target: 'node16',
  jsx: 'react-jsx',
  external: [
    'react',
    'react-dom',
    'react-markdown',
    'mermaid',
    '@excalidraw/excalidraw',
  ],
}));