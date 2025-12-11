import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    exclude: ['photon-wasm'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          photon: ['photon-wasm'],
          vendor: ['@angular/core', '@angular/common', '@angular/router'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // Enable caching for better dev experience
      'Cache-Control': 'public, max-age=31536000',
    },
    fs: {
      allow: ['..'],
    },
    middlewareMode: false,
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  // Enable production optimizations
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
  },
});
