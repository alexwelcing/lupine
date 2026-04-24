#!/usr/bin/env python3
"""
LUPINE BLUEBONNET - Automated Optimization Engine
===================================================
Runs N iterations, scoring each against botanical targets.
Keeps the best result. Sweeps key parameters automatically.

Usage: python optimize_lupine.py [num_iterations]
"""

import math, sys, os, random, json, time
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from collections import Counter
from itertools import product as iterproduct

ELEM_COLOR = {'H':'#ffffff','C':'#909090','N':'#3050f8','F':'#90e050','S':'#ffff30'}
ELEM_RADIUS = {'H':0.31,'C':0.76,'N':0.71,'F':0.57,'S':1.05}

# ================================================================
# BOTANICAL TARGETS (what a perfect bluebonnet scores)
# ================================================================
TARGETS = {
    'bond_count': (5000, 10000),     # accept slightly higher for visual density
    'atom_count': (900, 1600),       # need more atoms for lush raceme
    'raceme_aspect': (1.4, 2.0),     # stocky cylinder, not tree-like
    'leaf_fraction': (0.20, 0.35),   # F atoms as fraction of total
    'bonnet_fraction': (0.06, 0.14), # H atoms (white spots) fraction
    'blue_fraction': (0.38, 0.55),   # N atoms fraction  
    'stem_fraction': (0.08, 0.18),   # C atoms fraction
    'leaf_spread': (10.0, 16.0),     # max XZ extent of leaves
    'raceme_width': (10.0, 14.0),    # diameter of flower cylinder
}

def score_molecule(atoms, bonds):
    """Score 0-100 against botanical targets."""
    n = len(atoms)
    counts = Counter(a[0] for a in atoms)
    
    # Spatial metrics
    xs = [a[1] for a in atoms]
    ys = [a[2] for a in atoms]
    zs = [a[3] for a in atoms]
    
    # Raceme atoms (N+H, upper portion)
    rac_atoms = [(x,y,z) for s,x,y,z in atoms if s in ('N','H')]
    if rac_atoms:
        rac_xs = [a[0] for a in rac_atoms]
        rac_ys = [a[1] for a in rac_atoms]
        rac_zs = [a[2] for a in rac_atoms]
        rac_w = max(max(rac_xs)-min(rac_xs), max(rac_zs)-min(rac_zs))
        rac_h = max(rac_ys) - min(rac_ys)
        rac_aspect = rac_h / max(rac_w, 0.1)
    else:
        rac_w, rac_aspect = 0, 0
    
    # Leaf spread
    leaf_atoms = [(x,y,z) for s,x,y,z in atoms if s == 'F']
    if leaf_atoms:
        lxs = [a[0] for a in leaf_atoms]
        lzs = [a[2] for a in leaf_atoms]
        leaf_spread = max(max(lxs)-min(lxs), max(lzs)-min(lzs))
    else:
        leaf_spread = 0
    
    metrics = {
        'bond_count': bonds,
        'atom_count': n,
        'raceme_aspect': rac_aspect,
        'leaf_fraction': counts.get('F',0)/max(n,1),
        'bonnet_fraction': counts.get('H',0)/max(n,1),
        'blue_fraction': counts.get('N',0)/max(n,1),
        'stem_fraction': counts.get('C',0)/max(n,1),
        'leaf_spread': leaf_spread,
        'raceme_width': rac_w,
    }
    
    total = 0
    details = {}
    for key, (lo, hi) in TARGETS.items():
        val = metrics[key]
        if lo <= val <= hi:
            s = 100
        elif val < lo:
            s = max(0, 100 - (lo - val) / max(lo, 0.01) * 200)
        else:
            s = max(0, 100 - (val - hi) / max(hi, 0.01) * 200)
        details[key] = (val, s)
        total += s
    
    return total / len(TARGETS), metrics, details

# ================================================================
# PARAMETERIZED GENERATOR
# ================================================================
def generate_molecule(p):
    atoms = []
    SH = p['stem_height']
    SS = p['stem_spacing']
    
    # 1. STEM
    n_stem = int(SH / SS)
    for i in range(n_stem):
        t = i / max(1, n_stem-1)
        atoms.append(('C', 0.06*math.sin(t*math.pi*2.2), t*SH, 0.04*math.cos(t*math.pi*1.8)))
    
    # 2. RACEME
    rb = SH * p['raceme_start']
    rt = SH * p['raceme_end']
    rl = rt - rb
    RR = p['raceme_radius']
    
    for w in range(p['n_whorls']):
        wt = w / max(1, p['n_whorls']-1)
        wy = rb + wt * rl
        
        # Taper only at tip
        tp = p['taper_start']
        if wt > tp:
            taper = 1.0 - ((wt-tp)/(1.0-tp)) * (1.0-p['taper_end'])
        else:
            taper = 1.0
        radius = RR * taper
        
        maturity = 1.0 - wt
        base_angle = w * 137.508 * math.pi / 180
        nf = p['florets_per_whorl'] if wt < 0.9 else max(2, p['florets_per_whorl']-1)
        
        for fi in range(nf):
            angle = base_angle + (fi/nf) * 2 * math.pi
            ca, sa = math.cos(angle), math.sin(angle)
            st = wy / SH
            sx = 0.06*math.sin(st*math.pi*2.2)
            sz = 0.04*math.cos(st*math.pi*1.8)
            
            # Pedicel (minimal)
            ped_len = radius * p['pedicel_frac']
            for pi in range(2):
                pt = (pi+1)/2
                atoms.append(('C', sx+ca*ped_len*pt, wy+pt*0.1, sz+sa*ped_len*pt))
            
            fx = sx + ca*radius
            fz = sz + sa*radius
            fy = wy
            ps = p['petal_spread'] * (0.4 + 0.6*maturity)
            
            perp_ca = math.cos(angle + math.pi/2)
            perp_sa = math.sin(angle + math.pi/2)
            
            # BANNER (outward + up)
            for boff in [(0.3, 0.55), (0.5, 0.40), (0.15, 0.60)]:
                atoms.append(('N', fx+ca*ps*boff[0], fy+ps*boff[1], fz+sa*ps*boff[0]))
            # Banner width
            atoms.append(('N', fx+ca*ps*0.25+perp_ca*ps*0.25, fy+ps*0.50, fz+sa*ps*0.25+perp_sa*ps*0.25))
            atoms.append(('N', fx+ca*ps*0.25-perp_ca*ps*0.25, fy+ps*0.50, fz+sa*ps*0.25-perp_sa*ps*0.25))
            
            # WHITE BONNET
            if maturity > p['bonnet_threshold']:
                for hoff in [(0.55, 0.70), (0.40, 0.80), (0.25, 0.65)]:
                    atoms.append(('H', fx+ca*ps*hoff[0], fy+ps*hoff[1], fz+sa*ps*hoff[0]))
                # Extra wide bonnet
                atoms.append(('H', fx+ca*ps*0.30+perp_ca*ps*0.15, fy+ps*0.65, fz+sa*ps*0.30+perp_sa*ps*0.15))
            
            # WINGS (outward + lateral)
            for side in [-1, 1]:
                atoms.append(('N', fx+ca*ps*0.2+perp_ca*side*ps*0.4, fy+ps*0.1, fz+sa*ps*0.2+perp_sa*side*ps*0.4))
                atoms.append(('N', fx+ca*ps*0.35+perp_ca*side*ps*0.5, fy+ps*0.05, fz+sa*ps*0.35+perp_sa*side*ps*0.5))
            
            # KEEL
            atoms.append(('N', fx+ca*ps*0.15, fy-ps*0.25, fz+sa*ps*0.15))
            atoms.append(('N', fx+ca*ps*0.30, fy-ps*0.15, fz+sa*ps*0.30))
            
            # CALYX
            atoms.append(('F', fx-ca*ps*0.1, fy-ps*0.35, fz-sa*ps*0.1))
            
            # STAMEN
            if maturity > 0.7 and fi % 2 == 0:
                atoms.append(('S', fx+ca*ps*0.1, fy+ps*0.05, fz+sa*ps*0.1))
    
    # 3. APEX BUDS
    apex_y = rt
    for i in range(p['n_apex_buds']):
        a = i * 137.508 * math.pi / 180
        r = max(0.3, 0.8 - i*0.06)
        atoms.append(('N', r*math.cos(a), apex_y+i*0.5, r*math.sin(a)))
        atoms.append(('N', r*0.5*math.cos(a+0.8), apex_y+i*0.5+0.25, r*0.5*math.sin(a+0.8)))
    atoms.append(('N', 0, apex_y+p['n_apex_buds']*0.5+0.5, 0))
    
    # 4. PALMATE LEAVES
    for cfg in p['leaves']:
        ay, la, nl, ls, ld = cfg
        atoms.extend(_palmate_leaf(ay*SH, la, nl, ls, ld, SH, SS, p['leaflet_gap'], p['leaf_spacing']))
    
    # 5. ROOT COLLAR
    for i in range(6):
        a = (i/6)*2*math.pi
        atoms.append(('C', 0.4*math.cos(a), 0.15, 0.4*math.sin(a)))
    
    return atoms

def _palmate_leaf(attach_y, angle, n_leaflets, length, droop, SH, SS, gap, lsp):
    la = []
    st = attach_y / SH
    bx = 0.06*math.sin(st*math.pi*2.2)
    bz = 0.04*math.cos(st*math.pi*1.8)
    ca, sa = math.cos(angle), math.sin(angle)
    
    pet_len = 3.0
    n_pet = max(2, int(pet_len/SS))
    for i in range(n_pet):
        pt = (i+1)/n_pet
        la.append(('C', bx+ca*pet_len*pt, attach_y-pt*droop*0.2, bz+sa*pet_len*pt))
    
    fpx = bx + ca*pet_len
    fpz = bz + sa*pet_len
    fpy = attach_y - droop*0.2
    
    for li in range(n_leaflets):
        la_angle = angle + (li-(n_leaflets-1)/2)*gap
        lca, lsa = math.cos(la_angle), math.sin(la_angle)
        cd = abs(li-(n_leaflets-1)/2)
        l_len = length*(1.0-cd*0.08)
        n_seg = max(2, int(l_len/lsp))
        for j in range(n_seg):
            lt = (j+1)/n_seg
            w = l_len*0.07*math.sin(lt*math.pi)*(1-lt*0.3)
            sx = fpx+lca*l_len*lt
            sz = fpz+lsa*l_len*lt
            sy = fpy - lt*droop*0.4 - cd*0.08
            la.append(('F', sx, sy, sz))
            if w > 0.1:
                pca = math.cos(la_angle+math.pi/2)
                psa = math.sin(la_angle+math.pi/2)
                la.append(('F', sx+w*pca, sy-0.02, sz+w*psa))
                la.append(('F', sx-w*pca, sy-0.02, sz-w*psa))
    return la

def center_atoms(atoms):
    xs=[a[1] for a in atoms]; ys=[a[2] for a in atoms]; zs=[a[3] for a in atoms]
    cx=(max(xs)+min(xs))/2; cy=(max(ys)+min(ys))/2; cz=(max(zs)+min(zs))/2
    return [(s,x-cx,y-cy,z-cz) for s,x,y,z in atoms]

def count_bonds(atoms, cutoff=2.5):
    n=len(atoms); bonds=0
    cs=cutoff*cutoff
    for i in range(n):
        for j in range(i+1,n):
            dx=atoms[i][1]-atoms[j][1]; dy=atoms[i][2]-atoms[j][2]; dz=atoms[i][3]-atoms[j][3]
            if dx*dx+dy*dy+dz*dz<cs: bonds+=1
    return bonds

def write_xyz(atoms, path):
    with open(path,'w') as f:
        f.write(f"{len(atoms)}\n")
        f.write('Lupinus texensis - Lupine Brand Molecule | Properties=species:S:1:pos:R:3 pbc="F F F"\n')
        for sym,x,y,z in atoms:
            f.write(f"{sym:2s}  {x:12.6f}  {y:12.6f}  {z:12.6f}\n")

def render_preview(atoms, label, output_path):
    fig = plt.figure(figsize=(12,10), facecolor='#0a0a14')
    fig.suptitle(label, color='white', fontsize=14, fontweight='bold', y=0.98)
    syms=[a[0] for a in atoms]
    xs=np.array([a[1] for a in atoms]); ys=np.array([a[2] for a in atoms]); zs=np.array([a[3] for a in atoms])
    colors=[ELEM_COLOR.get(s,'#888') for s in syms]
    sizes=[ELEM_RADIUS.get(s,0.5)*40 for s in syms]
    
    for idx,(title,azim,elev) in enumerate([('Front',0,0),('Side',90,0),('Iso',30,-60),('Top',0,90)]):
        ax=fig.add_subplot(2,2,idx+1,projection='3d',facecolor='#0a0a14')
        ax.scatter(xs,zs,ys,c=colors,s=sizes,alpha=0.85,edgecolors='none')
        ax.set_title(title,color='white',fontsize=11)
        ax.view_init(elev=elev,azim=azim)
        for pane in [ax.xaxis.pane,ax.yaxis.pane,ax.zaxis.pane]:
            pane.fill=False; pane.set_edgecolor('#222')
        ax.grid(True,alpha=0.1)
        mr=max(xs.max()-xs.min(),ys.max()-ys.min(),zs.max()-zs.min())/2
        mx,my,mz=(xs.max()+xs.min())/2,(ys.max()+ys.min())/2,(zs.max()+zs.min())/2
        ax.set_xlim(mx-mr,mx+mr); ax.set_ylim(mz-mr,mz+mr); ax.set_zlim(my-mr,my+mr)
        ax.tick_params(colors='#333')
    
    counts=Counter(syms)
    fig.text(0.5,0.02,f"Atoms:{len(atoms)} N:{counts.get('N',0)} H:{counts.get('H',0)} C:{counts.get('C',0)} F:{counts.get('F',0)} S:{counts.get('S',0)}",
             ha='center',color='#aaa',fontsize=9,fontfamily='monospace')
    plt.savefig(output_path,dpi=100,bbox_inches='tight',facecolor='#0a0a14')
    plt.close()

# ================================================================
# PARAMETER SPACE
# ================================================================
BASE_PARAMS = {
    'stem_height': 40.0,
    'stem_spacing': 0.85,
    'raceme_start': 0.28,
    'raceme_end': 0.94,
    'raceme_radius': 6.0,
    'taper_start': 0.88,
    'taper_end': 0.35,
    'n_whorls': 14,
    'florets_per_whorl': 4,
    'pedicel_frac': 0.4,
    'petal_spread': 1.6,
    'bonnet_threshold': 0.30,
    'n_apex_buds': 6,
    'leaflet_gap': 0.36,
    'leaf_spacing': 1.8,
    'leaves': [
        (0.04, 0.3,  5, 5.5, 3.0),
        (0.07, 2.5,  5, 5.0, 3.2),
        (0.06,-1.3,  5, 5.2, 2.8),
        (0.11, 1.7,  5, 4.5, 2.5),
        (0.10,-0.5,  5, 4.8, 2.6),
        (0.16, 0.8,  5, 4.0, 2.0),
        (0.18,-1.8,  5, 3.5, 1.8),
    ],
}

# Parameters to sweep and their ranges
SWEEP_SPACE = {
    'raceme_radius':  [5.5, 6.0, 6.5, 7.0],
    'n_whorls':       [10, 12, 14, 16, 18],
    'florets_per_whorl': [3, 4, 5],
    'petal_spread':   [1.4, 1.6, 1.8, 2.0],
    'taper_start':    [0.85, 0.88, 0.90, 0.93],
    'raceme_start':   [0.25, 0.28, 0.30],
    'raceme_end':     [0.90, 0.92, 0.94],
    'bonnet_threshold': [0.25, 0.30, 0.35],
    'pedicel_frac':   [0.3, 0.4, 0.5],
    'stem_height':    [36.0, 40.0, 44.0],
    'leaf_spacing':   [1.5, 1.8, 2.0],
    'leaflet_gap':    [0.32, 0.36, 0.40],
}

def mutate_params(base, rng):
    """Random mutation of 2-4 parameters."""
    p = dict(base)
    keys = list(SWEEP_SPACE.keys())
    n_mutations = rng.randint(2, 4)
    for _ in range(n_mutations):
        key = rng.choice(keys)
        p[key] = rng.choice(SWEEP_SPACE[key])
    return p

def main():
    n_iters = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    opt_dir = os.path.join(output_dir, 'optimization')
    os.makedirs(opt_dir, exist_ok=True)
    
    rng = random.Random(42)
    best_score = -1
    best_params = None
    best_atoms = None
    results = []
    
    print(f"\n{'='*70}")
    print(f"  LUPINE BLUEBONNET OPTIMIZATION ENGINE -- {n_iters} iterations")
    print(f"{'='*70}\n")
    
    for it in range(1, n_iters+1):
        t0 = time.time()
        
        # Generate params: first iteration uses base, rest mutate from best
        if it == 1:
            params = dict(BASE_PARAMS)
        elif best_params:
            params = mutate_params(best_params, rng)
            # Keep leaves from base (complex structure)
            params['leaves'] = BASE_PARAMS['leaves']
        else:
            params = mutate_params(BASE_PARAMS, rng)
            params['leaves'] = BASE_PARAMS['leaves']
        
        # Generate
        atoms = generate_molecule(params)
        atoms = center_atoms(atoms)
        
        # Count bonds
        bonds = count_bonds(atoms, 2.5)
        
        # Score
        score, metrics, details = score_molecule(atoms, bonds)
        dt = time.time() - t0
        
        # Track
        result = {
            'iteration': it,
            'score': round(score, 1),
            'atoms': len(atoms),
            'bonds': bonds,
            'params': {k:v for k,v in params.items() if k != 'leaves'},
            'metrics': {k:round(v,3) for k,v in metrics.items()},
        }
        results.append(result)
        
        is_best = score > best_score
        if is_best:
            best_score = score
            best_params = dict(params)
            best_atoms = atoms[:]
            # Save best XYZ
            write_xyz(atoms, os.path.join(output_dir, 'lupine_bluebonnet.xyz'))
            # Save preview
            render_preview(atoms, f'BEST iter {it} | score={score:.1f}', os.path.join(opt_dir, f'best_{it:03d}.png'))
        
        # Print progress
        flag = ' *** NEW BEST ***' if is_best else ''
        print(f"  [{it:3d}/{n_iters}] score={score:5.1f} | atoms={len(atoms):5d} | bonds={bonds:6d} | {dt:.1f}s{flag}")
        
        # Print detail breakdown every 10 iterations or on new best
        if is_best or it % 10 == 0:
            for key, (val, s) in details.items():
                lo, hi = TARGETS[key]
                marker = '  OK' if s >= 80 else ' LOW' if val < lo else 'HIGH'
                print(f"      {key:20s}: {val:8.2f}  [{lo:.2f}-{hi:.2f}]  {marker} ({s:.0f})")
            if is_best:
                print(f"      --- Key params: R={params['raceme_radius']}, W={params['n_whorls']}, F={params['florets_per_whorl']}, PS={params['petal_spread']}")
    
    # Final summary
    print(f"\n{'='*70}")
    print(f"  OPTIMIZATION COMPLETE")
    print(f"{'='*70}")
    print(f"  Best score: {best_score:.1f}/100")
    print(f"  Best atoms: {len(best_atoms)}")
    print(f"  Best bonds: {count_bonds(best_atoms, 2.5)}")
    print(f"  Best params:")
    for k, v in best_params.items():
        if k != 'leaves':
            print(f"    {k}: {v}")
    
    # Save final best preview
    render_preview(best_atoms, f'FINAL BEST | score={best_score:.1f}', os.path.join(opt_dir, 'FINAL_BEST.png'))
    
    # Save results log
    with open(os.path.join(opt_dir, 'optimization_log.json'), 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n  Output: {os.path.join(opt_dir, 'FINAL_BEST.png')}")
    print(f"  Log:    {os.path.join(opt_dir, 'optimization_log.json')}")
    print(f"  XYZ:    {os.path.join(output_dir, 'lupine_bluebonnet.xyz')}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()
