const fs = require('fs');
const wasm = require('./atlas/atlas-view/packages/parsers/wasm/pkg/atlas_parsers.js');
const content = fs.readFileSync('atlas/atlas-view/apps/web/public/gallery/ti_hcp_tension_13k.lammpstrj', 'utf8');
try {
  const result = wasm.parseDump(content);
  console.log("Parsed ok! Array length: " + result.length);
} catch (e) {
  console.error("WASM threw: ", e);
}
