import re

with open('packages/scene/src/AtomsOptimized.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Geometries
content = re.sub(
    r'const geoHigh = useMemo\(\(\) => new THREE\.IcosahedronGeometry\(1, 2\), \[\]\);.*?162 verts',
    'const geoHigh = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);',
    content, flags=re.DOTALL
)
content = re.sub(r'const geoMed = useMemo\(\(\) => new THREE\.IcosahedronGeometry\(1, 1\), \[\]\);.*?\n', '', content)
content = re.sub(r'const geoLow = useMemo\(\(\) => new THREE\.IcosahedronGeometry\(1, 0\), \[\]\);.*?\n', '', content)

# 2. Add visibleAtomsCountRef
content = re.sub(
    r'const spatialHashRef = useRef\(new SpatialHash3D\(3\.0\)\);',
    'const spatialHashRef = useRef(new SpatialHash3D(3.0));\n  const visibleAtomsCountRef = useRef(0);',
    content
)

# 3. Remove meshRefMed and meshRefLow
content = re.sub(r'const meshRefMed = useRef<THREE\.InstancedMesh>\(null!\);\n', '', content)
content = re.sub(r'const meshRefLow = useRef<THREE\.InstancedMesh>\(null!\);\n', '', content)

# 4. Update useFrame
new_use_frame = """// Copy visible atoms to GPU
    const meshH = meshRefHigh.current;
    if (meshH && visibleAtomsCountRef.current > 0) {
      const dstMatH = meshH.instanceMatrix.array as Float32Array;
      const dstColH = meshH.instanceColor ? (meshH.instanceColor.array as Float32Array) : null;
      const dstPropH = activeGeoHigh.attributes.instanceProp.array as Float32Array;

      const totalAtoms = Math.min(visibleAtomsCountRef.current, capacity);
      
      for (let i = 0; i < totalAtoms; i++) {
        const mIdx = i * 16;
        
        dstMatH[mIdx + 0]  = cpuMatrixArray[mIdx + 0];
        dstMatH[mIdx + 1]  = cpuMatrixArray[mIdx + 1];
        dstMatH[mIdx + 2]  = cpuMatrixArray[mIdx + 2];
        dstMatH[mIdx + 3]  = cpuMatrixArray[mIdx + 3];
        dstMatH[mIdx + 4]  = cpuMatrixArray[mIdx + 4];
        dstMatH[mIdx + 5]  = cpuMatrixArray[mIdx + 5];
        dstMatH[mIdx + 6]  = cpuMatrixArray[mIdx + 6];
        dstMatH[mIdx + 7]  = cpuMatrixArray[mIdx + 7];
        dstMatH[mIdx + 8]  = cpuMatrixArray[mIdx + 8];
        dstMatH[mIdx + 9]  = cpuMatrixArray[mIdx + 9];
        dstMatH[mIdx + 10] = cpuMatrixArray[mIdx + 10];
        dstMatH[mIdx + 11] = cpuMatrixArray[mIdx + 11];
        dstMatH[mIdx + 12] = cpuMatrixArray[mIdx + 12];
        dstMatH[mIdx + 13] = cpuMatrixArray[mIdx + 13];
        dstMatH[mIdx + 14] = cpuMatrixArray[mIdx + 14];
        dstMatH[mIdx + 15] = 1;

        if (dstColH) {
          const cIdx = i * 3;
          dstColH[cIdx] = cpuColorArray[cIdx];
          dstColH[cIdx + 1] = cpuColorArray[cIdx + 1];
          dstColH[cIdx + 2] = cpuColorArray[cIdx + 2];
        }
        dstPropH[i] = cpuPropArray[i];
      }

      meshH.count = totalAtoms;
      meshH.instanceMatrix.needsUpdate = true;
      (meshH.instanceMatrix as any).updateRange = { offset: 0, count: totalAtoms * 16 };
      if (meshH.instanceColor) {
        meshH.instanceColor.needsUpdate = true;
        (meshH.instanceColor as any).updateRange = { offset: 0, count: totalAtoms * 3 };
      }
      activeGeoHigh.attributes.instanceProp.needsUpdate = true;
      (activeGeoHigh.attributes.instanceProp as any).updateRange = { offset: 0, count: totalAtoms };

      if (renderStyle === 'toon')"""
content = re.sub(
    r'// 🔭 VIEW is the secret math! Frustum \+ Dynamic Distance Culling \(LOD\).*?if \(renderStyle === \'toon\'\)',
    new_use_frame,
    content,
    flags=re.DOTALL
)

# 5. Update uploadFrame
new_upload_frame = """// --- Occlusion Culling Grid Build ---
    const useOcclusion = frame.natoms > 10000;
    let occGrid: Uint8Array | null = null;
    let occDimX = 0, occDimY = 0, occDimZ = 0;
    let occMinX = 0, occMinY = 0, occMinZ = 0;
    const occCellSize = 3.8; // Slightly larger than bond length
    
    if (useOcclusion) {
      occMinX = Infinity; occMinY = Infinity; occMinZ = Infinity;
      let occMaxX = -Infinity, occMaxY = -Infinity, occMaxZ = -Infinity;
      for (let i = 0; i < frame.natoms * 3; i += 3) {
        const x = positions[i]; const y = positions[i+1]; const z = positions[i+2];
        if (x < occMinX) occMinX = x; if (x > occMaxX) occMaxX = x;
        if (y < occMinY) occMinY = y; if (y > occMaxY) occMaxY = y;
        if (z < occMinZ) occMinZ = z; if (z > occMaxZ) occMaxZ = z;
      }
      occDimX = Math.ceil((occMaxX - occMinX) / occCellSize) + 2;
      occDimY = Math.ceil((occMaxY - occMinY) / occCellSize) + 2;
      occDimZ = Math.ceil((occMaxZ - occMinZ) / occCellSize) + 2;
      
      const totalCells = occDimX * occDimY * occDimZ;
      if (totalCells > 0 && totalCells < 50000000) {
        occGrid = new Uint8Array(totalCells);
        for (let i = 0; i < frame.natoms; i++) {
          const gx = Math.floor((positions[i*3] - occMinX) / occCellSize) + 1;
          const gy = Math.floor((positions[i*3+1] - occMinY) / occCellSize) + 1;
          const gz = Math.floor((positions[i*3+2] - occMinZ) / occCellSize) + 1;
          occGrid[gx + gy * occDimX + gz * occDimX * occDimY] = 1;
        }
      }
    }

    let visibleCount = 0;
    for (let i = 0; i < frame.natoms; i++) {
      // Position
      let x = positions[i * 3];
      let y = positions[i * 3 + 1];
      let z = positions[i * 3 + 2];

      if (nextPos && t > 0) {
        let dx = nextPos[i * 3] - x;
        let dy = nextPos[i * 3 + 1] - y;
        let dz = nextPos[i * 3 + 2] - z;

        if (hasBounds) {
          if (dx > bsx / 2) dx -= bsx;
          if (dx < -bsx / 2) dx += bsx;
          if (dy > bsy / 2) dy -= bsy;
          if (dy < -bsy / 2) dy += bsy;
          if (dz > bsz / 2) dz -= bsz;
          if (dz < -bsz / 2) dz += bsz;
        }

        x += dx * t;
        y += dy * t;
        z += dz * t;
      }

      // Occlusion check
      let fullyEnclosed = false;
      if (occGrid) {
        const gx = Math.floor((positions[i*3] - occMinX) / occCellSize) + 1;
        const gy = Math.floor((positions[i*3+1] - occMinY) / occCellSize) + 1;
        const gz = Math.floor((positions[i*3+2] - occMinZ) / occCellSize) + 1;
        
        fullyEnclosed = true;
        for (let dx = -1; dx <= 1 && fullyEnclosed; dx++) {
          for (let dy = -1; dy <= 1 && fullyEnclosed; dy++) {
            for (let dz = -1; dz <= 1 && fullyEnclosed; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const nX = gx + dx;
              const nY = gy + dy;
              const nZ = gz + dz;
              // Only check if neighbor is within bounds, if out of bounds it's empty so we are NOT enclosed
              if (nX >= 0 && nX < occDimX && nY >= 0 && nY < occDimY && nZ >= 0 && nZ < occDimZ) {
                  const gIdx = nX + nY * occDimX + nZ * occDimX * occDimY;
                  if (occGrid[gIdx] === 0) fullyEnclosed = false;
              } else {
                  fullyEnclosed = false;
              }
            }
          }
        }
      }
      if (fullyEnclosed) continue; // Skip interior atoms!
      
      const typeId = types[i] < MAX_TYPES ? types[i] : 0;
      const radius = hiddenLookup[typeId] ? 0 : radiiLookup[typeId] * scale * scaleOverrideLookup[typeId];
      if (radius === 0) continue;
      
      // Inline matrix building into the CPU array
      const mIdx = visibleCount * 16;
      cpuMatrixArray[mIdx + 0] = radius; cpuMatrixArray[mIdx + 1] = 0;      cpuMatrixArray[mIdx + 2] = 0;       cpuMatrixArray[mIdx + 3] = 0;
      cpuMatrixArray[mIdx + 4] = 0;      cpuMatrixArray[mIdx + 5] = radius; cpuMatrixArray[mIdx + 6] = 0;       cpuMatrixArray[mIdx + 7] = 0;
      cpuMatrixArray[mIdx + 8] = 0;      cpuMatrixArray[mIdx + 9] = 0;      cpuMatrixArray[mIdx + 10] = radius; cpuMatrixArray[mIdx + 11] = 0;
      cpuMatrixArray[mIdx + 12] = x;     cpuMatrixArray[mIdx + 13] = y;     cpuMatrixArray[mIdx + 14] = z;      cpuMatrixArray[mIdx + 15] = 1;

      // Color
      const cIdx = visibleCount * 3;
      if (botanicalMode) {
        const isHighlighted = highlightedAtoms?.has(i);
        if (isHighlighted) {
          cpuColorArray[cIdx] = Math.min(1, botR[typeId] * 1.5);
          cpuColorArray[cIdx + 1] = Math.min(1, botG[typeId] * 1.5);
          cpuColorArray[cIdx + 2] = Math.min(1, botB[typeId] * 1.5);
        } else {
          cpuColorArray[cIdx] = botR[typeId];
          cpuColorArray[cIdx + 1] = botG[typeId];
          cpuColorArray[cIdx + 2] = botB[typeId];
        }
        cpuPropArray[visibleCount] = 0.0;
      } else if (isPropMode) {
        let val = propData![i];
        if (nextPropData && nextPropData.length > i) {
          val = val + (nextPropData[i] - val) * t;
        }
        const norm = pMax > pMin ? (val - pMin) / (pMax - pMin) : 0.5;
        const [r, g, b] = mapFn(norm);
        cpuColorArray[cIdx] = r;
        cpuColorArray[cIdx + 1] = g;
        cpuColorArray[cIdx + 2] = b;
        cpuPropArray[visibleCount] = norm;
      } else {
        const isHighlighted = highlightedAtoms?.has(i);
        let r, g, b;
        if (colorMode === 'uniform') {
          r = uniR; g = uniG; b = uniB;
        } else {
          r = typR[typeId]; g = typG[typeId]; b = typB[typeId];
        }
        
        if (isHighlighted) {
          cpuColorArray[cIdx] = Math.min(1, r * 1.5);
          cpuColorArray[cIdx + 1] = Math.min(1, g * 1.5);
          cpuColorArray[cIdx + 2] = Math.min(1, b * 1.5);
        } else {
          cpuColorArray[cIdx] = r;
          cpuColorArray[cIdx + 1] = g;
          cpuColorArray[cIdx + 2] = b;
        }
        cpuPropArray[visibleCount] = 0.0;
      }
      
      visibleCount++;
    }

    visibleAtomsCountRef.current = visibleCount;"""
content = re.sub(
    r'for \(let i = 0; i < frame\.natoms; i\+\+\) \{.*?cpuPropArray\[i\] = 0\.0;\n\s*\}',
    new_upload_frame,
    content,
    flags=re.DOTALL
)

# 6. Clean up
content = re.sub(r'geoMed\.dispose\(\);\n\s*geoLow\.dispose\(\);\n', '', content)
content = re.sub(r'<instancedMesh\n\s*ref=\{meshRefMed\}.*?</instancedMesh>', '', content, flags=re.DOTALL)
content = re.sub(r'<instancedMesh\n\s*ref=\{meshRefLow\}.*?</instancedMesh>', '', content, flags=re.DOTALL)

with open('packages/scene/src/AtomsOptimized.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
