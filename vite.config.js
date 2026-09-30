import { defineConfig } from 'vite';

// Relative base so the build works at any path: https://<user>.github.io/<repo>/,
// a user site at the root, or a custom domain. No repo name to keep in sync.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000, // three.js alone is ~700 kB
  },
});
