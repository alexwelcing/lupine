import { Frame } from '../types';

export function generateLupineFrame(): Frame {
  const atoms: { type: number; x: number; y: number; z: number }[] = [];
  
  const STEM_HEIGHT = 20.0;
  
  // 1. GENERATE PREFAB (A single perfect Lupine)
  const prefab: { type: number; x: number; y: number; z: number }[] = [];
  
  // Stop stem slightly before the apex so it doesn't poke out
  const n_stem = Math.floor((STEM_HEIGHT * 0.9) / 0.4);
  for (let i = 0; i < n_stem; i++) {
    const t = i / Math.max(1, n_stem - 1);
    const y = t * (STEM_HEIGHT * 0.9) - (STEM_HEIGHT / 2); // Center on Y
    for (let strand = 0; strand < 3; strand++) {
      const sx = 0.25 * Math.sin(t * Math.PI * 4.0 + strand * 2.09);
      const sz = 0.25 * Math.cos(t * Math.PI * 4.0 + strand * 2.09);
      prefab.push({ type: 6, x: sx, y, z: sz }); // Carbon stem
    }
  }

  // 2. THE BLUEBONNET RACEME
  const raceme_base = STEM_HEIGHT * 0.15 - (STEM_HEIGHT / 2);
  const raceme_top = STEM_HEIGHT * 0.95 - (STEM_HEIGHT / 2);
  const raceme_len = raceme_top - raceme_base;
  
  // Restoring the dense, iconic conical shape of the Bluebonnet
  const total_florets = 400; 
  const golden_angle = 137.508 * Math.PI / 180.0;
  const RACEME_RADIUS = 2.8; // Tighter radius to form the solid cone

  for (let i = 0; i < total_florets; i++) {
    const t = i / (total_florets - 1);
    const angle = i * golden_angle;
    
    // Conical taper ensures the classic pointed top
    const taper = 1.0 - t * 0.95; 
    const radius = RACEME_RADIUS * taper;
    const y = raceme_base + t * raceme_len;
    
    const cx = radius * Math.cos(angle);
    const cz = radius * Math.sin(angle);
    
    const out_x = Math.cos(angle);
    const out_z = Math.sin(angle);
    const perp_x = -out_z;
    const perp_z = out_x;
    
    const is_white_cap = t > 0.85;
    const floret_type = is_white_cap ? 1 : 7; // 1 = White (H), 7 = Blue (N)
    const highlight_type = is_white_cap ? 1 : 1; 
    
    // Scale florets proportionally so they pack tightly
    const fs = taper * 0.6 + 0.3; 

    if (t > 0.97) {
      prefab.push({ type: 1, x: cx*0.2, y: y, z: cz*0.2 });
      continue;
    }

    // Pedicel - shortened to keep florets tight against the stem
    const y_hub = y - 0.2 * fs; 
    const pedicel_len = Math.sqrt(cx*cx + (y - y_hub)*(y - y_hub) + cz*cz);
    const n_ped_atoms = Math.max(2, Math.floor(pedicel_len / 0.3));
    for (let p = 0; p < n_ped_atoms; p++) {
      const pt = (p + 1) / n_ped_atoms;
      const py = y_hub + (y - y_hub) * pt - Math.sin(pt * Math.PI) * 0.15;
      prefab.push({ type: 6, x: cx * pt, y: py, z: cz * pt });
    }
    
    // Floret Shape
    prefab.push({ type: floret_type, x: cx, y: y + 0.8 * fs, z: cz });
    prefab.push({ type: floret_type, x: cx + perp_x*0.6*fs - out_x*0.2*fs, y: y + 1.2 * fs, z: cz + perp_z*0.6*fs - out_z*0.2*fs });
    prefab.push({ type: floret_type, x: cx - perp_x*0.6*fs - out_x*0.2*fs, y: y + 1.2 * fs, z: cz - perp_z*0.6*fs - out_z*0.2*fs });
    prefab.push({ type: floret_type, x: cx + perp_x*0.9*fs - out_x*0.4*fs, y: y + 0.7 * fs, z: cz + perp_z*0.9*fs - out_z*0.4*fs });
    prefab.push({ type: floret_type, x: cx - perp_x*0.9*fs - out_x*0.4*fs, y: y + 0.7 * fs, z: cz - perp_z*0.9*fs - out_z*0.4*fs });
    
    if (!is_white_cap) {
      prefab.push({ type: highlight_type, x: cx + out_x*0.2*fs, y: y + 0.6 * fs, z: cz + out_z*0.2*fs });
      prefab.push({ type: highlight_type, x: cx + out_x*0.2*fs + perp_x*0.2*fs, y: y + 0.9 * fs, z: cz + out_z*0.2*fs + perp_z*0.2*fs });
      prefab.push({ type: highlight_type, x: cx + out_x*0.2*fs - perp_x*0.2*fs, y: y + 0.9 * fs, z: cz + out_z*0.2*fs - perp_z*0.2*fs });
    }

    prefab.push({ type: floret_type, x: cx + out_x*1.2*fs + perp_x*0.6*fs, y: y + 0.1 * fs, z: cz + out_z*1.2*fs + perp_z*0.6*fs });
    prefab.push({ type: floret_type, x: cx + out_x*1.2*fs - perp_x*0.6*fs, y: y + 0.1 * fs, z: cz + out_z*1.2*fs - perp_z*0.6*fs });
    prefab.push({ type: floret_type, x: cx + out_x*1.8*fs + perp_x*0.4*fs, y: y - 0.2 * fs, z: cz + out_z*1.8*fs + perp_z*0.4*fs });
    prefab.push({ type: floret_type, x: cx + out_x*1.8*fs - perp_x*0.4*fs, y: y - 0.2 * fs, z: cz + out_z*1.8*fs - perp_z*0.4*fs });

    prefab.push({ type: floret_type, x: cx + out_x*1.4*fs, y: y - 0.4 * fs, z: cz + out_z*1.4*fs });
    prefab.push({ type: floret_type, x: cx + out_x*2.0*fs, y: y - 0.6 * fs, z: cz + out_z*2.0*fs });
  }

  const palmateLeaf = (attach_y: number, angle: number, n_leaflets: number = 5, length: number = 6.0, droop: number = 1.2) => {
    const st = (attach_y + (STEM_HEIGHT / 2)) / STEM_HEIGHT;
    const bx = 0.25 * Math.sin(st * Math.PI * 4.0);
    const bz = 0.25 * Math.cos(st * Math.PI * 4.0);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);

    const pet_len = 3.5;
    const n_pet = Math.max(2, Math.floor(pet_len / 0.4));
    for (let i = 0; i < n_pet; i++) {
      const pt = (i + 1) / n_pet;
      prefab.push({ type: 6, x: bx + ca * pet_len * pt, y: attach_y + pt * 0.8, z: bz + sa * pet_len * pt });
    }

    const fpx = bx + ca * pet_len;
    const fpz = bz + sa * pet_len;
    const fpy = attach_y + 0.8;

    const spread = 0.55; 
    for (let li = 0; li < n_leaflets; li++) {
      const la_angle = angle + (li - (n_leaflets - 1) / 2) * spread;
      const lca = Math.cos(la_angle);
      const lsa = Math.sin(la_angle);

      const cd = Math.abs(li - (n_leaflets - 1) / 2); 
      const l_len = length * (1.0 - cd * 0.15); 

      const n_seg = Math.max(2, Math.floor(l_len / 0.15));
      for (let j = 0; j < n_seg; j++) {
        const lt = (j + 1) / n_seg;
        const w = l_len * 0.1 * Math.sin(lt * Math.PI) * (1 - lt * 0.2);
        
        const sx = fpx + lca * l_len * lt;
        const sz = fpz + lsa * l_len * lt;
        const sy = fpy + Math.sin(lt * Math.PI) * 0.5 - lt * lt * droop;

        const perp_ca = Math.cos(la_angle + Math.PI/2);
        const perp_sa = Math.sin(la_angle + Math.PI/2);

        prefab.push({ type: 9, x: sx, y: sy, z: sz });
        if (w > 0.05) {
          prefab.push({ type: 9, x: sx + perp_ca*w, y: sy, z: sz + perp_sa*w });
          prefab.push({ type: 9, x: sx - perp_ca*w, y: sy, z: sz - perp_sa*w });
        }
      }
    }
  };

  palmateLeaf(-1.0, 0.2, 5, 4.0, 1.2);
  palmateLeaf(-3.5, 2.5, 5, 5.0, 1.5);
  palmateLeaf(-5.5, 4.8, 7, 5.5, 1.8);
  palmateLeaf(-8.0, 1.2, 7, 6.0, 2.2);

  // 4. INSTANCE THE PREFAB ACROSS A HILL
  const FIELD_RADIUS = 60; // 120x120 area
  const SPACING = 12.0; // Distance between plants
  
  const hillHeight = (x: number, z: number) => {
    const distSq = x*x + z*z;
    return 15.0 * Math.exp(-distSq / (FIELD_RADIUS * 10)); // gentle rolling hill
  };

  for (let px = -FIELD_RADIUS; px <= FIELD_RADIUS; px += SPACING) {
    for (let pz = -FIELD_RADIUS; pz <= FIELD_RADIUS; pz += SPACING) {
      const distSq = px*px + pz*pz;
      if (distSq > FIELD_RADIUS*FIELD_RADIUS) continue; // Keep them in a circular patch
      
      const jitterX = (Math.random() - 0.5) * SPACING * 0.6;
      const jitterZ = (Math.random() - 0.5) * SPACING * 0.6;
      
      const ox = px + jitterX;
      const oz = pz + jitterZ;
      const oy = hillHeight(ox, oz);
      const scale = 0.7 + Math.random() * 0.6; // Variety in plant sizes
      
      for (let i = 0; i < prefab.length; i++) {
        const pa = prefab[i];
        atoms.push({
          type: pa.type,
          x: pa.x * scale + ox,
          y: pa.y * scale + oy,
          z: pa.z * scale + oz
        });
      }
    }
  }

  // Add organic ground layer so it doesn't float in the void
  for (let px = -FIELD_RADIUS - 10; px <= FIELD_RADIUS + 10; px += 2.0) {
    for (let pz = -FIELD_RADIUS - 10; pz <= FIELD_RADIUS + 10; pz += 2.0) {
      const distSq = px*px + pz*pz;
      if (distSq > (FIELD_RADIUS+10)*(FIELD_RADIUS+10)) continue;
      
      const oy = hillHeight(px, pz) - (STEM_HEIGHT/2) * 0.7 - Math.random(); 
      // Earthy ground scatter
      atoms.push({ type: 6, x: px, y: oy, z: pz });
      atoms.push({ type: 9, x: px + 1.0, y: oy - 0.5, z: pz + 1.0 });
    }
  }

  // Convert to frame
  const natoms = atoms.length;
  const ids = new Int32Array(natoms);
  const types = new Int32Array(natoms);
  const positions = new Float32Array(natoms * 3);
  
  for (let i = 0; i < natoms; i++) {
    ids[i] = i + 1;
    types[i] = atoms[i].type;
    positions[i * 3 + 0] = atoms[i].x;
    positions[i * 3 + 1] = atoms[i].y;
    positions[i * 3 + 2] = atoms[i].z;
  }

  const bonds = new Int32Array(0);

  // Expanded boxBounds automatically forces the viewer camera to zoom out
  return {
    timestep: 0,
    natoms,
    boxBounds: new Float64Array([-FIELD_RADIUS, FIELD_RADIUS, -10, 30, -FIELD_RADIUS, FIELD_RADIUS]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids,
    types,
    positions,
    bonds,
    properties: new Map()
  };
}
