#!/usr/bin/env python3
"""
LUPINE BLUEBONNET — Iterative Refinement Harness
═══════════════════════════════════════════════════
Generates the molecule, renders 4-view matplotlib preview,
counts bonds, and saves all artifacts per iteration.

Usage: python iterate_lupine.py [iteration_number]

Reference:
- Lupinus texensis raceme: cylindrical spike, 250mm, 20-40 florets
- Florets: papilionaceous (banner + 2 wings + keel)
- Banner has WHITE SPOT = THE "bonnet" → key identifier
- Bottom flowers: open, lighter blue, white spot visible
- Top buds: tight, dark purple/blue, no white spot
- Leaves: palmate compound, 5-7 lance leaflets, LOW on stem
- Stem: sturdy, slightly hairy (modeled as dense C chain)

Bond cutoff in viewer: 2.5Å default
- Stem C-C: 0.75-1.0Å → bonded ✓
- Pedicel C-C: 0.8-1.0Å → bonded ✓  
- Within floret: 1.2-2.0Å → bonded ✓
- Between florets: >3.0Å → NOT bonded ✓
- Leaf vein F-F: 0.8-1.2Å → bonded ✓
- Between leaflets: >3.0Å → NOT bonded ✓
"""

import math
import sys
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
from collections import Counter

# ═══════════════════════════════════════════════════════════════
# ELEMENT REGISTRY (matching atlas-view/elements.ts)
# ═══════════════════════════════════════════════════════════════
ELEM_COLOR = {
    'H':  '#ffffff',  # white — bonnet spots
    'C':  '#909090',  # gray — stem
    'N':  '#3050f8',  # deep blue — petals  
    'F':  '#90e050',  # green — leaves
    'S':  '#ffff30',  # yellow — stamen
}

ELEM_RADIUS = {
    'H':  0.31,
    'C':  0.76,
    'N':  0.71,
    'F':  0.57,
    'S':  1.05,
}

# ═══════════════════════════════════════════════════════════════
# GENERATION PARAMETERS
# ═══════════════════════════════════════════════════════════════
STEM_HEIGHT      = 36.0
STEM_SPACING     = 0.85

RACEME_START_PCT = 0.30
RACEME_END_PCT   = 0.93

# CYLINDRICAL raceme -- WIDE and STOCKY, unmistakable
RACEME_RADIUS    = 5.5
RACEME_TOP_TAPER = 0.35

N_WHORLS         = 16      # Dense
FLORETS_PER_WHORL = 4      # 4 per ring = 90 deg spacing = no overlap
PEDICEL_SPACING  = 0.85

FLORET_INNER_SPACING = 1.8  # Petals close enough to bond internally
FLORET_ISOLATION     = 5.0

N_LEAFLETS       = 7
LEAF_SPACING     = 1.5
LEAFLET_GAP      = 0.32

def generate_molecule():
    atoms = []
    
    # ═══════════════════════════════════════════════════════════
    # 1. MAIN STEM (RACHIS) - Minimalist abstract line
    # ═══════════════════════════════════════════════════════════
    n_stem = int(STEM_HEIGHT / STEM_SPACING)
    for i in range(n_stem):
        t = i / max(1, n_stem - 1)
        y = t * STEM_HEIGHT
        x = 0.1 * math.sin(t * math.pi * 3.0)
        z = 0.1 * math.cos(t * math.pi * 3.0)
        atoms.append(('C', x, y, z))
    
    # ═══════════════════════════════════════════════════════════
    # 2. THE BLUEBONNET RACEME (Pure Abstract Phyllotaxis)
    # ═══════════════════════════════════════════════════════════
    raceme_base = STEM_HEIGHT * 0.35
    raceme_top  = STEM_HEIGHT * 0.95
    raceme_len  = raceme_top - raceme_base
    
    total_florets = 250
    golden_angle = 137.508 * math.pi / 180.0
    
    for i in range(total_florets):
        t = i / (total_florets - 1)  # 0 to 1
        
        # Golden spiral distribution
        angle = i * golden_angle
        
        # Abstract silhouette: wide bottom, cylindrical middle, sharp taper at top
        if t < 0.2:
            taper = 0.5 + 0.5 * (t / 0.2)  # flare out at base
        elif t > 0.8:
            taper = 1.0 - ((t - 0.8) / 0.2) ** 1.5 # sharp taper at apex
        else:
            taper = 1.0
            
        radius = RACEME_RADIUS * taper
        y = raceme_base + t * raceme_len
        
        # Central coordinate
        cx = radius * math.cos(angle)
        cz = radius * math.sin(angle)
        
        # The White Cap is the top 20% of the flower
        is_white_cap = t > 0.80
        
        if is_white_cap:
            # Dense white apex
            atoms.append(('H', cx, y, cz))
            atoms.append(('H', cx*0.6, y+0.2, cz*0.6))
        else:
            # Abstract mature floret: Blue ('N') outer, White ('H') spot, Yellow ('S') core
            # We construct a geometric "V" shape projecting outward
            out_x = math.cos(angle)
            out_z = math.sin(angle)
            perp_x = -out_z
            perp_z = out_x
            
            # The blue body
            atoms.append(('N', cx, y, cz))
            atoms.append(('N', cx + perp_x*1.5, y + 0.5, cz + perp_z*1.5))
            atoms.append(('N', cx - perp_x*1.5, y + 0.5, cz - perp_z*1.5))
            atoms.append(('N', cx + out_x*2.0, y - 0.5, cz + out_z*2.0))
            
            # The white spot on the banner
            atoms.append(('H', cx + out_x*0.5, y + 1.2, cz + out_z*0.5))
            
            # A touch of yellow stamen in older florets
            if t < 0.5 and i % 3 == 0:
                atoms.append(('S', cx + out_x*1.0, y, cz + out_z*1.0))
            
            # Pedicel connecting to stem
            atoms.append(('C', cx*0.3, y - 0.5, cz*0.3))

    # ═══════════════════════════════════════════════════════════
    # 3. PALMATE COMPOUND LEAVES (Abstracted geometric fans)
    # ═══════════════════════════════════════════════════════════
    def palmate_leaf(attach_y, angle, n_leaflets=5, length=6.0, droop=1.2):
        la = []
        st = attach_y / STEM_HEIGHT
        bx = 0.06 * math.sin(st * math.pi * 2.2)
        bz = 0.04 * math.cos(st * math.pi * 1.8)
        ca, sa = math.cos(angle), math.sin(angle)

        
        # Petiole (C chain → bonds to stem)
        pet_len = 3.0
        n_pet = max(2, int(pet_len / STEM_SPACING))
        for i in range(n_pet):
            pt = (i + 1) / n_pet
            la.append(('C', bx + ca * pet_len * pt, attach_y - pt * droop * 0.2, bz + sa * pet_len * pt))
        
        # Fan point
        fpx = bx + ca * pet_len
        fpz = bz + sa * pet_len
        fpy = attach_y - droop * 0.2
        
        # Leaflets radiating from fan point
        spread = LEAFLET_GAP  # radians between leaflets
        for li in range(n_leaflets):
            la_angle = angle + (li - (n_leaflets - 1) / 2) * spread
            lca, lsa = math.cos(la_angle), math.sin(la_angle)
            
            # Center leaflet longest
            cd = abs(li - (n_leaflets - 1) / 2)
            l_len = length * (1.0 - cd * 0.08)
            
            # Narrow lance-shaped leaflet
            n_seg = max(2, int(l_len / LEAF_SPACING))
            for j in range(n_seg):
                lt = (j + 1) / n_seg
                # Width profile: narrow lance
                w = l_len * 0.07 * math.sin(lt * math.pi) * (1 - lt * 0.3)
                
                sx = fpx + lca * l_len * lt
                sz = fpz + lsa * l_len * lt
                sy = fpy - lt * droop * 0.4 - cd * 0.08
                
                # Central vein
                la.append(('F', sx, sy, sz))
                
                # Margin atoms (create leaf width)
                if w > 0.1:
                    pca = math.cos(la_angle + math.pi / 2)
                    psa = math.sin(la_angle + math.pi / 2)
                    la.append(('F', sx + w * pca, sy - 0.02, sz + w * psa))
                    la.append(('F', sx - w * pca, sy - 0.02, sz - w * psa))
        
        return la
    
    leaf_configs = [
        (STEM_HEIGHT * 0.04, 0.3,    7, 8.5, 3.8),   # HUGE, very low, droopy
        (STEM_HEIGHT * 0.07, 2.5,    7, 8.0, 4.0),   # HUGE
        (STEM_HEIGHT * 0.06, -1.3,   7, 8.2, 3.5),   # HUGE
        (STEM_HEIGHT * 0.11, 1.7,    7, 6.5, 3.0),   # medium-large
        (STEM_HEIGHT * 0.10, -0.5,   7, 6.8, 3.2),   # medium-large
        (STEM_HEIGHT * 0.16, 0.8,    5, 5.5, 2.5),   # medium
        (STEM_HEIGHT * 0.18, -1.8,   5, 5.0, 2.2),   # medium-small
        (STEM_HEIGHT * 0.22, 3.5,    5, 4.0, 1.8),   # small, high
    ]
    
    for ay, la, nl, ls, ld in leaf_configs:
        atoms.extend(palmate_leaf(ay, la, n_leaflets=nl, length=ls, droop=ld))
    
    # ═══════════════════════════════════════════════════════════
    # 5. ROOT COLLAR
    # ═══════════════════════════════════════════════════════════
    for i in range(6):
        a = (i / 6) * 2 * math.pi
        atoms.append(('C', 0.4 * math.cos(a), 0.15, 0.4 * math.sin(a)))
    
    return atoms

def center_atoms(atoms):
    xs = [a[1] for a in atoms]
    ys = [a[2] for a in atoms]
    zs = [a[3] for a in atoms]
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2
    cz = (max(zs) + min(zs)) / 2
    return [(s, x-cx, y-cy, z-cz) for s, x, y, z in atoms]

def count_bonds(atoms, cutoff=2.5):
    n = len(atoms)
    bonds = 0
    for i in range(n):
        for j in range(i+1, n):
            dx = atoms[i][1] - atoms[j][1]
            dy = atoms[i][2] - atoms[j][2]
            dz = atoms[i][3] - atoms[j][3]
            if dx*dx + dy*dy + dz*dz < cutoff*cutoff:
                bonds += 1
    return bonds

def write_xyz(atoms, path):
    with open(path, 'w') as f:
        f.write(f"{len(atoms)}\n")
        f.write('Lupinus texensis - Lupine Brand Molecule | Properties=species:S:1:pos:R:3 pbc="F F F"\n')
        for sym, x, y, z in atoms:
            f.write(f"{sym:2s}  {x:12.6f}  {y:12.6f}  {z:12.6f}\n")

def render_preview(atoms, iteration, output_dir):
    """Render 4-view matplotlib preview."""
    fig = plt.figure(figsize=(20, 16), facecolor='#0a0a14')
    fig.suptitle(f'Lupine Bluebonnet — Iteration {iteration}', 
                 color='white', fontsize=18, fontweight='bold', y=0.98)
    
    # Prepare data
    syms = [a[0] for a in atoms]
    xs = np.array([a[1] for a in atoms])
    ys = np.array([a[2] for a in atoms])
    zs = np.array([a[3] for a in atoms])
    
    colors = [ELEM_COLOR.get(s, '#888888') for s in syms]
    sizes = [ELEM_RADIUS.get(s, 0.5) * 40 for s in syms]
    
    views = [
        ('Front (XY)', 0, 0),
        ('Side (YZ)', 90, 0),
        ('Isometric', 30, -60),
        ('Top (XZ)', 0, 90),
    ]
    
    for idx, (title, azim, elev) in enumerate(views):
        ax = fig.add_subplot(2, 2, idx + 1, projection='3d', facecolor='#0a0a14')
        ax.scatter(xs, zs, ys, c=colors, s=sizes, alpha=0.85, edgecolors='none')
        ax.set_title(title, color='white', fontsize=14, pad=10)
        ax.view_init(elev=elev, azim=azim)
        
        # Style
        ax.set_xlabel('X', color='#555')
        ax.set_ylabel('Z', color='#555')
        ax.set_zlabel('Y', color='#555')
        ax.tick_params(colors='#333')
        ax.xaxis.pane.fill = False
        ax.yaxis.pane.fill = False
        ax.zaxis.pane.fill = False
        ax.xaxis.pane.set_edgecolor('#222')
        ax.yaxis.pane.set_edgecolor('#222')
        ax.zaxis.pane.set_edgecolor('#222')
        ax.grid(True, alpha=0.1)
        
        # Equal aspect
        max_range = max(xs.max()-xs.min(), ys.max()-ys.min(), zs.max()-zs.min()) / 2
        mid_x = (xs.max()+xs.min()) / 2
        mid_y = (ys.max()+ys.min()) / 2
        mid_z = (zs.max()+zs.min()) / 2
        ax.set_xlim(mid_x - max_range, mid_x + max_range)
        ax.set_ylim(mid_z - max_range, mid_z + max_range)
        ax.set_zlim(mid_y - max_range, mid_y + max_range)
    
    # Stats annotation
    counts = Counter(syms)
    stats = f"Atoms: {len(atoms)} | N(blue): {counts.get('N',0)} | H(white): {counts.get('H',0)} | C(stem): {counts.get('C',0)} | F(leaf): {counts.get('F',0)} | S(stamen): {counts.get('S',0)}"
    fig.text(0.5, 0.02, stats, ha='center', color='#aaa', fontsize=11, fontfamily='monospace')
    
    preview_path = os.path.join(output_dir, f'iter_{iteration:02d}.png')
    plt.savefig(preview_path, dpi=120, bbox_inches='tight', facecolor='#0a0a14')
    plt.close()
    return preview_path

def main():
    iteration = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    preview_dir = os.path.join(output_dir, 'iterations')
    os.makedirs(preview_dir, exist_ok=True)
    
    print(f"\n{'='*60}")
    print(f"  LUPINE BLUEBONNET -- Iteration {iteration}")
    print(f"{'='*60}")
    
    # Generate
    atoms = generate_molecule()
    atoms = center_atoms(atoms)
    
    # Write XYZ
    xyz_path = os.path.join(output_dir, 'lupine_bluebonnet.xyz')
    write_xyz(atoms, xyz_path)
    
    # Stats
    counts = Counter(a[0] for a in atoms)
    print(f"  Total atoms: {len(atoms)}")
    for elem, count in sorted(counts.items()):
        print(f"    {elem}: {count}")
    
    xs = [a[1] for a in atoms]
    ys = [a[2] for a in atoms]
    zs = [a[3] for a in atoms]
    print(f"  Bounding box: X=[{min(xs):.1f}, {max(xs):.1f}] Y=[{min(ys):.1f}, {max(ys):.1f}] Z=[{min(zs):.1f}, {max(zs):.1f}]")
    
    # Bond analysis (sample-based for speed)
    if len(atoms) < 3000:
        bonds = count_bonds(atoms, 2.5)
        print(f"  Bonds (2.5Å cutoff): {bonds}")
    
    # Render preview
    preview_path = render_preview(atoms, iteration, preview_dir)
    print(f"  Preview: {preview_path}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
