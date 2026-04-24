#!/usr/bin/env python3
"""
LUPINE BLUEBONNET — Brand Molecule Generator v3 (Final Production)
═══════════════════════════════════════════════════════════════════

Reference-driven recreation of Lupinus texensis (Texas Bluebonnet).
This version is built from botanical reference to be UNMISTAKABLE.

CRITICAL BOTANICAL FEATURES (from USDA/UT Austin reference):
1. Terminal raceme — CYLINDRICAL spike (not conical/Christmas tree), 250mm tall
2. 20-40 florets arranged in alternate spirals along the rachis
3. Each floret is papilionaceous: banner (top, with white spot), 2 wings, 1 keel
4. The banner's WHITE SPOT is the defining "bonnet" feature
5. Buds at top are TIGHT and darker purple/blue
6. Open flowers at bottom are lighter blue with prominent white spots
7. Raceme tapers only SLIGHTLY at the tip — NOT a cone
8. Palmate leaves: 5-7 narrow leaflets radiating from a single point
9. Leaves cluster LOW on the stem, NOT distributed evenly
10. Pedicels (short stalks) connect each floret to the rachis

BOND STRATEGY:
- The viewer auto-bonds atoms within ~2.5Å (configurable)
- Place stem atoms at ~1.2Å spacing → strong continuous bonds
- Place floret atoms at ~1.5-1.8Å → bonds within each floret
- Keep floret clusters at ~3.0Å from each other → no inter-floret bonds
- Place leaf atoms at ~1.0-1.4Å → tight leaf structure
- Connect leaves to stem with bridging atoms → visible petiole bonds

Element Mapping:
- N  (7, blue #3050f8, r=0.71)   → flower petals
- H  (1, white #ffffff, r=0.31)   → white banner spots (THE bonnet)
- C  (6, gray #909090, r=0.76)    → main stem (rachis) + petioles
- F  (9, green #90e050, r=0.57)   → leaf blades
- S  (16, yellow #ffff30, r=1.05) → stamen/pistil accents (few, selective)
"""

import math

atoms = []

# ═══════════════════════════════════════════════════════════════
# PARAMETERS — Tuned from botanical reference
# ═══════════════════════════════════════════════════════════════
STEM_HEIGHT = 32.0        # Total height
RACEME_START = 0.42       # Where the raceme begins (fraction of height)
RACEME_END   = 1.0        # Where it ends
STEM_SPACING = 0.75       # Bond-forming spacing for stem atoms

# Raceme parameters — CYLINDRICAL not conical
RACEME_RADIUS_BASE = 3.2  # Width at base of raceme
RACEME_RADIUS_TOP  = 1.8  # Width at top (slight taper, NOT a cone)
N_WHORLS = 16             # Number of flower whorls
FLORETS_PER_WHORL = 5     # Flowers per level

# Floret scale
FLORET_SPREAD = 1.0       # How far petals spread from center
PEDICEL_LENGTH = 0.8      # Short stalk connecting floret to stem

# Leaf parameters
N_LEAF_CLUSTERS = 4       # Number of compound leaves
LEAFLET_COUNT = 5         # Leaflets per leaf
LEAF_SIZE = 5.0           # Length of leaflets

# ═══════════════════════════════════════════════════════════════
# 1. MAIN STEM (RACHIS) — Continuous carbon chain with bonds
# ═══════════════════════════════════════════════════════════════
n_stem_atoms = int(STEM_HEIGHT / STEM_SPACING)
stem_positions = []
for i in range(n_stem_atoms):
    t = i / (n_stem_atoms - 1)
    y = t * STEM_HEIGHT
    # Very subtle organic sway
    x = 0.08 * math.sin(t * math.pi * 2.0)
    z = 0.05 * math.cos(t * math.pi * 1.5)
    atoms.append(('C', x, y, z))
    stem_positions.append((x, y, z))

# ═══════════════════════════════════════════════════════════════
# 2. FLOWER RACEME — The defining feature
#    Cylindrical spike with whorled florets
# ═══════════════════════════════════════════════════════════════
raceme_base_y = STEM_HEIGHT * RACEME_START
raceme_top_y  = STEM_HEIGHT * RACEME_END

for whorl in range(N_WHORLS):
    wt = whorl / (N_WHORLS - 1)  # 0=bottom, 1=top
    whorl_y = raceme_base_y + wt * (raceme_top_y - raceme_base_y)
    
    # Slight taper — cylindrical with rounded top
    # Use a power curve so it stays wide until near the top
    taper = 1.0 - (wt ** 2.5) * 0.45
    whorl_radius = RACEME_RADIUS_BASE * taper
    
    # Maturity gradient: bottom=fully open, top=tight buds
    maturity = 1.0 - wt  # 1.0=fully open, 0.0=tight bud
    
    # Golden angle rotation for natural phyllotaxis
    base_angle = whorl * 137.508 * math.pi / 180
    
    n_florets = FLORETS_PER_WHORL if wt < 0.85 else max(3, FLORETS_PER_WHORL - 2)
    
    for fi in range(n_florets):
        angle = base_angle + (fi / n_florets) * 2 * math.pi
        ca, sa = math.cos(angle), math.sin(angle)
        
        # ─── Pedicel (short stalk from stem to floret) ───
        # Place 2 carbon atoms bridging stem→floret
        stem_x = 0.08 * math.sin(wt * math.pi * 2.0)
        stem_z = 0.05 * math.cos(wt * math.pi * 1.5)
        
        ped_steps = 3
        for ps in range(ped_steps):
            pt = (ps + 1) / ped_steps
            px = stem_x + ca * PEDICEL_LENGTH * pt * (whorl_radius / RACEME_RADIUS_BASE)
            pz = stem_z + sa * PEDICEL_LENGTH * pt * (whorl_radius / RACEME_RADIUS_BASE)
            py = whorl_y + pt * 0.15 * (1 - maturity)  # slight upward angle
            atoms.append(('C', px, py, pz))
        
        # Floret center position
        fx = stem_x + ca * whorl_radius
        fz = stem_z + sa * whorl_radius
        fy = whorl_y
        
        # Scale petals by maturity (buds are small and tight)
        ps = FLORET_SPREAD * (0.3 + 0.7 * maturity)
        
        # ─── BANNER PETAL (top, large, THE defining feature) ───
        # The banner faces outward and upward
        banner_x = fx + ca * ps * 0.5
        banner_z = fz + sa * ps * 0.5
        banner_y = fy + ps * 0.65
        atoms.append(('N', banner_x, banner_y, banner_z))
        
        # Extra banner body atoms for bigger petal
        atoms.append(('N', fx + ca * ps * 0.3, fy + ps * 0.5, fz + sa * ps * 0.3))
        atoms.append(('N', fx + ca * ps * 0.6, fy + ps * 0.45, fz + sa * ps * 0.6))
        
        # ★ THE WHITE BONNET SPOT — THE signature feature ★
        # Only on open flowers (bottom 65% of raceme)
        if maturity > 0.35:
            # White spot at the tip of the banner
            spot_x = fx + ca * ps * 0.7
            spot_z = fz + sa * ps * 0.7
            spot_y = fy + ps * 0.75
            atoms.append(('H', spot_x, spot_y, spot_z))
            
            # Second white accent for visibility
            atoms.append(('H', fx + ca * ps * 0.55, fy + ps * 0.8, fz + sa * ps * 0.55))
        
        # ─── WING PETALS (two lateral petals) ───
        for side in [-1, 1]:
            perp_ca = math.cos(angle + side * math.pi / 2.8)
            perp_sa = math.sin(angle + side * math.pi / 2.8)
            
            # Wing base
            wx = fx + perp_ca * ps * 0.5
            wz = fz + perp_sa * ps * 0.5
            wy = fy + ps * 0.2
            atoms.append(('N', wx, wy, wz))
            
            # Wing tip (slightly forward)
            wx2 = fx + (perp_ca * 0.7 + ca * 0.3) * ps * 0.6
            wz2 = fz + (perp_sa * 0.7 + sa * 0.3) * ps * 0.6
            wy2 = fy + ps * 0.15
            atoms.append(('N', wx2, wy2, wz2))
        
        # ─── KEEL PETAL (bottom, boat-shaped) ───
        keel_x = fx + ca * ps * 0.15
        keel_z = fz + sa * ps * 0.15
        keel_y = fy - ps * 0.25
        atoms.append(('N', keel_x, keel_y, keel_z))
        
        # Keel tip
        atoms.append(('N', fx + ca * ps * 0.35, fy - ps * 0.15, fz + sa * ps * 0.35))
        
        # ─── CALYX (green, at floret base, connecting to pedicel) ───
        calyx_x = fx - ca * ps * 0.1
        calyx_z = fz - sa * ps * 0.1
        calyx_y = fy - ps * 0.35
        atoms.append(('F', calyx_x, calyx_y, calyx_z))
        
        # ─── Stamen accent (only on fully open flowers, selective) ───
        if maturity > 0.65 and fi % 2 == 0:
            atoms.append(('S', fx + ca * ps * 0.2, fy + ps * 0.1, fz + sa * ps * 0.2))

# ═══════════════════════════════════════════════════════════════
# 3. BUD CLUSTER AT APEX — Tight, dark, characteristic
# ═══════════════════════════════════════════════════════════════
apex_y = raceme_top_y
for i in range(8):
    angle = (i * 137.508) * math.pi / 180
    r = max(0.3, 0.8 - i * 0.06)
    by = apex_y + i * 0.5
    atoms.append(('N', r * math.cos(angle), by, r * math.sin(angle)))
    # Tight inner bud
    atoms.append(('N', r * 0.4 * math.cos(angle + 0.5), by + 0.25, r * 0.4 * math.sin(angle + 0.5)))

# Final tip
atoms.append(('N', 0, apex_y + 4.5, 0))
atoms.append(('N', 0.1, apex_y + 4.8, 0.05))
atoms.append(('N', -0.05, apex_y + 5.1, -0.05))

# ═══════════════════════════════════════════════════════════════
# 4. PALMATE COMPOUND LEAVES — Low on stem, radiating
#    Each leaf: petiole (C) → 5-7 narrow leaflets (F) fanning out
# ═══════════════════════════════════════════════════════════════
def make_palmate_leaf(attach_y, leaf_angle, n_leaflets=5, size=5.0, droop=1.2):
    """Generate a botanically accurate palmate compound leaf."""
    leaf_atoms = []
    
    # Get stem position at attachment point
    t_stem = attach_y / STEM_HEIGHT
    base_x = 0.08 * math.sin(t_stem * math.pi * 2.0)
    base_z = 0.05 * math.cos(t_stem * math.pi * 1.5)
    
    ca, sa = math.cos(leaf_angle), math.sin(leaf_angle)
    
    # Petiole — carbon chain from stem to leaflet fan point
    petiole_len = 2.5
    petiole_atoms = 6
    for i in range(petiole_atoms):
        pt = (i + 1) / petiole_atoms
        px = base_x + ca * petiole_len * pt
        pz = base_z + sa * petiole_len * pt
        py = attach_y - pt * droop * 0.3
        leaf_atoms.append(('C', px, py, pz))
    
    # Fan point (where leaflets radiate from)
    fan_x = base_x + ca * petiole_len
    fan_z = base_z + sa * petiole_len
    fan_y = attach_y - droop * 0.3
    
    # Generate leaflets fanning out
    fan_spread = 0.32  # Angular spread between leaflets (radians)
    
    for li in range(n_leaflets):
        # Angle of this leaflet
        offset = (li - (n_leaflets - 1) / 2) * fan_spread
        la = leaf_angle + offset
        lca, lsa = math.cos(la), math.sin(la)
        
        # Leaflet length varies — center is longest
        center_dist = abs(li - (n_leaflets - 1) / 2)
        l_len = size * (1.0 - center_dist * 0.10)
        
        # Leaflet shape: narrow ellipse (lance/oblanceolate)
        n_segments = 12
        for j in range(n_segments):
            lt = j / (n_segments - 1)
            
            # Width profile: widest at ~40%, tapering to point
            width_t = lt * 2.5 if lt < 0.4 else (1.0 - lt) / 0.6
            width = l_len * 0.06 * max(0, width_t)
            
            # Position along leaflet
            seg_x = fan_x + lca * l_len * lt
            seg_z = fan_z + lsa * l_len * lt
            seg_y = fan_y - lt * droop * 0.5 - center_dist * 0.1
            
            # Central vein atom
            leaf_atoms.append(('F', seg_x, seg_y, seg_z))
            
            # Edge atoms (bilateral, for leaf width)
            if width > 0.12:
                perp_ca = math.cos(la + math.pi / 2)
                perp_sa = math.sin(la + math.pi / 2)
                leaf_atoms.append(('F', 
                    seg_x + width * perp_ca, seg_y - 0.03, seg_z + width * perp_sa))
                leaf_atoms.append(('F', 
                    seg_x - width * perp_ca, seg_y - 0.03, seg_z - width * perp_sa))
    
    return leaf_atoms

# Leaves cluster low on the stem — 15-35% of stem height
leaf_configs = [
    (STEM_HEIGHT * 0.10, 0.5,    5, 5.5, 1.5),   # low-front
    (STEM_HEIGHT * 0.15, 2.7,    5, 5.0, 1.8),   # low-back-left
    (STEM_HEIGHT * 0.12, -1.5,   5, 5.2, 1.6),   # low-back-right
    (STEM_HEIGHT * 0.22, 1.5,    5, 4.5, 1.3),   # mid-left
    (STEM_HEIGHT * 0.20, -0.3,   5, 4.8, 1.4),   # mid-right
    (STEM_HEIGHT * 0.30, 0.9,    5, 3.8, 1.0),   # upper (smaller)
]

for ay, la, nl, ls, ld in leaf_configs:
    atoms.extend(make_palmate_leaf(ay, la, n_leaflets=nl, size=ls, droop=ld))

# ═══════════════════════════════════════════════════════════════
# 5. ROOT COLLAR / BASAL ROSETTE — anchoring at ground level
# ═══════════════════════════════════════════════════════════════
for i in range(8):
    angle = (i / 8) * 2 * math.pi
    r = 0.5
    atoms.append(('C', r * math.cos(angle), 0.2, r * math.sin(angle)))
    atoms.append(('C', r * 0.7 * math.cos(angle + 0.2), -0.1, r * 0.7 * math.sin(angle + 0.2)))


# ═══════════════════════════════════════════════════════════════
# CENTER AND WRITE
# ═══════════════════════════════════════════════════════════════
output_path = 'lupine_bluebonnet.xyz'

all_x = [a[1] for a in atoms]
all_y = [a[2] for a in atoms]
all_z = [a[3] for a in atoms]
cx = (max(all_x) + min(all_x)) / 2
cy = (max(all_y) + min(all_y)) / 2
cz = (max(all_z) + min(all_z)) / 2

centered = [(sym, x - cx, y - cy, z - cz) for sym, x, y, z in atoms]

with open(output_path, 'w') as f:
    f.write(f"{len(centered)}\n")
    f.write('Lupinus texensis — Lupine Brand Molecule | Properties=species:S:1:pos:R:3 pbc="F F F"\n')
    for sym, x, y, z in centered:
        f.write(f"{sym:2s}  {x:12.6f}  {y:12.6f}  {z:12.6f}\n")

print(f"Generated {output_path} with {len(centered)} atoms")

from collections import Counter
counts = Counter(a[0] for a in atoms)
for elem, count in sorted(counts.items()):
    print(f"  {elem}: {count}")

bbox = f"X=[{min(all_x):.1f}, {max(all_x):.1f}], Y=[{min(all_y):.1f}, {max(all_y):.1f}], Z=[{min(all_z):.1f}, {max(all_z):.1f}]"
print(f"  Bounding box: {bbox}")

# Bond analysis: count pairs within cutoff
bond_count = 0
cutoff = 2.5
for i in range(len(centered)):
    for j in range(i+1, len(centered)):
        dx = centered[i][1] - centered[j][1]
        dy = centered[i][2] - centered[j][2]
        dz = centered[i][3] - centered[j][3]
        if dx*dx + dy*dy + dz*dz < cutoff*cutoff:
            bond_count += 1
print(f"  Estimated bonds (cutoff {cutoff}Å): {bond_count}")
