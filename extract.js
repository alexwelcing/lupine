const fs = require('fs');

const path = require('path');
const galleryPath = path.join(__dirname, 'atlas', 'atlas-view', 'packages', 'ui', 'src', 'Gallery.tsx');
const content = fs.readFileSync(galleryPath, 'utf8');

const startIdx = content.indexOf('const EXAMPLES');
const endIdx = content.indexOf('export function Gallery(');
const lastBracket = content.lastIndexOf(']', endIdx);

const arrayText = content.substring(content.indexOf('[', startIdx), lastBracket + 1);

try {
    const EXAMPLES = new Function('return ' + arrayText)();
    
    // Add "featured": true to exactly the 12 items for glimPSE-demo.html
    const featuredIds = [
      'cuzr_melt',
      'al_polycrystal',
      'slit_crack',
      'sapphire',
      'ti_hcp',
      'multielement_nanoparticle',
      'au_melt',
      'alanine_dipeptide',
      'graphene_nanoribbon',
      'cnt_bundle',
      'sio2_glass',
      'pe_chain'
    ];
    
    EXAMPLES.forEach(ex => {
      if (featuredIds.includes(ex.id)) {
        ex.featured = true;
      }
    });

    const outPath = path.join(__dirname, 'atlas', 'atlas-view', 'packages', 'ui', 'src', 'gallery-data.json');
    fs.writeFileSync(outPath, JSON.stringify(EXAMPLES, null, 2));
    console.log(`Successfully extracted ${EXAMPLES.length} examples to gallery-data.json`);
} catch (e) {
    console.error('Extraction failed:', e);
}
