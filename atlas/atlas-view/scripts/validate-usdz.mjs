#!/usr/bin/env node
/**
 * USDZ Validation Script
 * 
 * Extracts and inspects a USDZ file to verify:
 * 1. Palette texture is present in textures/
 * 2. Material references the palette texture via diffuseColor connect
 * 3. UV coordinates are present on the mesh
 * 4. primvars:displayColor (vertex colors) are present as fallback
 * 
 * Usage: node scripts/validate-usdz.mjs <path-to-file.usdz>
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

// USDZ is a zip file (uncompressed) per Apple's spec
// We'll parse it manually since it's just a zip with 0-level compression

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-usdz.mjs <path-to-file.usdz>');
  process.exit(1);
}

const data = readFileSync(file);

// Simple ZIP parser for store-only (level 0) entries
function parseZip(buffer) {
  const entries = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  while (offset < buffer.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compMethod = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(buffer.slice(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const fileData = buffer.slice(dataStart, dataStart + compSize);

    entries.push({ name, compMethod, compSize, uncompSize, data: fileData });
    offset = dataStart + compSize;
  }

  return entries;
}

const entries = parseZip(data);

console.log('\n=== USDZ Archive Contents ===');
for (const e of entries) {
  console.log(`  ${e.name} (${e.compSize} bytes, method: ${e.compMethod})`);
}

// Find and analyze the model.usda file
const modelEntry = entries.find(e => e.name === 'model.usda');
if (!modelEntry) {
  console.error('\n❌ No model.usda found in archive!');
  process.exit(1);
}

const usda = new TextDecoder().decode(modelEntry.data);

console.log('\n=== Material Analysis ===');

// Check for diffuseColor texture connection (our palette fix)
const diffuseConnect = usda.match(/inputs:diffuseColor\.connect\s*=\s*<([^>]+)>/g);
if (diffuseConnect) {
  console.log('✅ diffuseColor is texture-connected:');
  diffuseConnect.forEach(m => console.log(`   ${m}`));
} else {
  const diffuseFlat = usda.match(/inputs:diffuseColor\s*=\s*\([^)]+\)/g);
  if (diffuseFlat) {
    console.log('⚠️  diffuseColor is flat (no texture):');
    diffuseFlat.forEach(m => console.log(`   ${m}`));
  }
}

// Check for texture references
const textureRefs = usda.match(/asset inputs:file = @([^@]+)@/g);
if (textureRefs) {
  console.log('\n✅ Texture references found:');
  textureRefs.forEach(m => console.log(`   ${m}`));
} else {
  console.log('\n⚠️  No texture references found');
}

// Check for texture files in the archive
const textureEntries = entries.filter(e => e.name.startsWith('textures/'));
if (textureEntries.length > 0) {
  console.log('\n✅ Texture files in archive:');
  textureEntries.forEach(e => console.log(`   ${e.name} (${e.compSize} bytes)`));
} else {
  console.log('\n❌ No texture files in archive!');
}

console.log('\n=== Geometry Analysis ===');

// Check for UV coordinates
const hasUVs = usda.includes('primvars:st');
console.log(hasUVs ? '✅ UV coordinates (primvars:st) present' : '❌ No UV coordinates found');

// Check for vertex colors (displayColor)
const hasDisplayColor = usda.includes('primvars:displayColor');
console.log(hasDisplayColor ? '✅ Vertex colors (primvars:displayColor) present as fallback' : '⚠️  No vertex colors (primvars:displayColor)');

// Check roughness and metalness
const roughness = usda.match(/inputs:roughness\s*=\s*([\d.]+)/);
const metalness = usda.match(/inputs:metallic\s*=\s*([\d.]+)/);
if (roughness) console.log(`   Roughness: ${roughness[1]}`);
if (metalness) console.log(`   Metalness: ${metalness[1]}`);

// Summary
console.log('\n=== Verdict ===');
if (diffuseConnect && textureEntries.length > 0 && hasUVs) {
  console.log('🎉 PASS: USDZ contains palette texture with UV mapping.');
  console.log('   Apple AR Quick Look should correctly render per-atom colors.');
} else if (hasDisplayColor && !diffuseConnect) {
  console.log('❌ FAIL: USDZ relies on vertex colors only.');
  console.log('   Apple AR Quick Look will IGNORE these and show flat material color.');
} else {
  console.log('⚠️  PARTIAL: Some color data present but may not render correctly in AR Quick Look.');
}

console.log('');
