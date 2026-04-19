import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

// Automatically construct input map for all HTML files in the project root
const getHtmlInputs = () => {
  const inputs = {};
  const files = fs.readdirSync(__dirname);
  for (const file of files) {
    if (file.endsWith('.html')) {
       const name = file.replace('.html', '');
       inputs[name] = resolve(__dirname, file);
    }
  }
  return inputs;
};

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: getHtmlInputs()
    }
  }
});
