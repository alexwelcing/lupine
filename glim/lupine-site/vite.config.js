import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        deck: resolve(__dirname, 'deck.html'),
        onepager: resolve(__dirname, 'one-pager.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
