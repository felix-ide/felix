import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Port configuration - configurable for integrated vs standalone
const WEB_UI_PORT = process.env.WEB_UI_PORT ? parseInt(process.env.WEB_UI_PORT) : 5101;
const BACKEND_PORT = process.env.BACKEND_PORT || '9000';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLibrary = mode === 'library';

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client/features': path.resolve(__dirname, './src/features'),
      '@client/shared': path.resolve(__dirname, './src/shared'),
      '@felix/theme-system': path.resolve(__dirname, '../../packages/theme-system/dist/index.js'),
    },
  },
  server: {
    port: WEB_UI_PORT,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      }
    }
  },
  build: isLibrary ? {
    lib: {
      entry: path.resolve(__dirname, 'src/lib.ts'),
      name: 'FelixWebUI',
      fileName: 'lib',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom', 
        'react-router-dom',
        'lucide-react',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM'
        }
      }
    },
    sourcemap: true,
    target: 'esnext'
  } : {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      external: [
        'webgpu',
        'fs', 'path', 'os', 'crypto', 'stream', 'util', 'events', 'buffer', 'url', 'querystring',
        'better-sqlite3',
        '@felix/client/adapters/browser'
      ],
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'import.meta.env.VITE_FELIX_SERVER': JSON.stringify(`http://localhost:${BACKEND_PORT}/api`),
  },
  optimizeDeps: {
    include: ['@felix/theme-system'],
    exclude: [
      'fs', 'path', 'os', 'crypto',
      'better-sqlite3',
      'felix'
    ],
  }
  };
});
