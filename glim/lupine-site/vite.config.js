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
        lammpsvisualizer: resolve(__dirname, 'lammps-visualizer.html'),
        platformarchitecture: resolve(__dirname, 'platform-architecture.html'),
        researchmanifesto: resolve(__dirname, 'research-manifesto.html'),
        gpucompute: resolve(__dirname, 'gpu-compute.html'),
        sovereigntymaterials: resolve(__dirname, 'sovereignty-materials.html'),
        casestudybatteries: resolve(__dirname, 'case-study-batteries.html'),
        casestudysuperalloys: resolve(__dirname, 'case-study-superalloys.html'),
        mlpotentialsguide: resolve(__dirname, 'ml-potentials-guide.html'),
        rustinscience: resolve(__dirname, 'rust-in-science.html'),
        defenseaerospace: resolve(__dirname, 'defense-aerospace.html'),
        investors: resolve(__dirname, 'investors.html'),

      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
