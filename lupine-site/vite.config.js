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
        pricing: resolve(__dirname, 'pricing.html'),
        team: resolve(__dirname, 'team.html'),
        glimpsedemo: resolve(__dirname, 'glimPSE-demo.html'),
        docs: resolve(__dirname, 'docs.html'),
        contact: resolve(__dirname, 'contact.html'),
        webgpucompute: resolve(__dirname, 'webgpu-compute.html'),
        solidstatebatteries: resolve(__dirname, 'solid-state-batteries.html'),
        aerospacealloys: resolve(__dirname, 'aerospace-alloys.html'),
        defensegovernment: resolve(__dirname, 'defense-government.html'),
        sovereignty: resolve(__dirname, 'sovereignty.html'),
        careers: resolve(__dirname, 'careers.html'),
        documentation: resolve(__dirname, 'documentation.html'),
        research: resolve(__dirname, 'research.html'),
        methodchgnet: resolve(__dirname, 'methods/chgnet.html'),
        methodm3gnet: resolve(__dirname, 'methods/m3gnet.html'),
        methodquantumledger: resolve(__dirname, 'methods/quantum-ledger.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
