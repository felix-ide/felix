import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/ExtendedMarkdownRenderer.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node16',
  jsx: 'react-jsx',
  external: [
    'react',
    'react-dom',
    'react-markdown',
    'mermaid',
    '@excalidraw/excalidraw',
  ],
});