# ATLAS View — Example Gallery
## Curated Datasets for the Website Launch

Each example is selected for **visual diversity**, **scientific relevance**, and **wow factor**.
We generate the dump files ourselves by running the official LAMMPS example scripts —
all from the LAMMPS GitHub repository (GPL, freely redistributable).

---

## Gallery Overview

| # | Name | Domain | Atoms | 2D/3D | Visual Hook | Source |
|---|------|--------|-------|-------|-------------|--------|
| 1 | Crack Propagation | Fracture mechanics | ~17K | 2D | Crack tip opening, dramatic failure | `examples/crack` |
| 2 | Nanoindentation | Materials testing | ~12K | 2D | Indenter push + lattice healing | `examples/indent` |
| 3 | LJ Melt | Phase transitions | ~32K | 3D | Rapid melting, liquid chaos | `examples/melt` |
| 4 | Granular Pour | Granular mechanics | ~10K | 3D | Particles falling into box, chute flow | `examples/pour` |
| 5 | Micelle Self-Assembly | Soft matter | ~5K | 2D | Lipid molecules form bilayers | `examples/micelle` |
| 6 | Couette Flow | Fluid dynamics | ~8K | 2D | Velocity gradient, channel flow | `examples/flow` |
| 7 | Colloid in Solvent | Colloids | ~5K | 2D | Big particles in small particle bath | `examples/colloid` |
| 8 | Polymer in Water | Polymer science | ~15K | 3D | Coiled chain in solvent | `lammpstutorials` |
| 9 | CNT Tensile Pull | Nanomaterials | ~2K | 3D | Carbon nanotube stretching + breaking | `lammpstutorials` |
| 10 | Shear Deformation | Plasticity | ~16K | 2D | Void growth under shear, defect nucleation | `examples/shear` |
| 11 | Peptide in Water | Biomolecular | ~2K | 3D | Small solvated peptide, 5-mer | `examples/peptide` |
| 12 | NaCl Crystal | Ionic materials | ~8K | 3D | Ionic crystal, two-type system | `examples/eim` |

---

## Example 1: Crack Propagation

**Domain:** Fracture mechanics / Materials science
**Visual appeal:** ★★★★★ — Dramatic crack tip opening in a 2D solid. The most visually striking of all LAMMPS examples.
**Why include:** Instantly communicates "materials science" to any viewer. The progressive crack opening is deeply satisfying to watch.

**Source:** `github.com/lammps/lammps/tree/develop/examples/crack`

**Script modifications for dump output:**
```lammps
# Add to in.crack before "run" command:
dump            viz all custom 100 dump.crack.* id type x y z c_peratom
dump_modify     viz sort id
```

**Color strategy:** Color by potential energy (`c_peratom`) — crack tip shows high stress (red), bulk is low energy (blue). This is the hero image for the website.

**Atom count:** ~16,900 (runs in seconds)
**Frames:** ~100 (adjustable via run length)

---

## Example 2: Nanoindentation

**Domain:** Materials testing / Mechanical properties
**Visual appeal:** ★★★★★ — Spherical indenter pushes into surface, displaces lattice, then retracts and partial healing occurs.
**Why include:** Directly relevant to experimental nanomechanics research. Shows deformation + recovery.

**Source:** `github.com/lammps/lammps/tree/develop/examples/indent`

**Script modifications:**
```lammps
dump            viz all custom 200 dump.indent.* id type x y z
dump_modify     viz sort id
```

**Color strategy:** Color by atom type (surface vs. bulk) or by displacement from initial position.

**Atom count:** ~11,760
**Frames:** ~50–100

---

## Example 3: Lennard-Jones Rapid Melt

**Domain:** Phase transitions / Fundamental physics
**Visual appeal:** ★★★★ — 3D system. Ordered FCC lattice rapidly melts into disordered liquid. Great for showing trajectory animation.
**Why include:** The "hello world" of MD. Every LAMMPS user knows this. Immediate recognition.

**Source:** `github.com/lammps/lammps/tree/develop/examples/melt`

**Modified script for larger system + dump:**
```lammps
# in.melt (modified for gallery)
units           lj
atom_style      atomic
lattice         fcc 0.8442
region          box block 0 10 0 10 0 10
create_box      1 box
create_atoms    1 box
mass            1 1.0
velocity        all create 3.0 87287 loop geom
pair_style      lj/cut 2.5
pair_coeff      1 1 1.0 1.0 2.5
neighbor        0.3 bin
neigh_modify    every 20 delay 0 check no
fix             1 all nve
dump            viz all custom 50 dump.melt.* id type x y z vx vy vz
dump_modify     viz sort id
thermo          50
run             5000
```

**Color strategy:** Color by kinetic energy (velocity magnitude) — hot atoms glow, cold atoms dark. Use `inferno` colormap.

**Atom count:** ~32,000 (10³ lattice × 4 FCC basis)
**Frames:** 100

---

## Example 4: Granular Pour

**Domain:** Granular mechanics / Industrial applications
**Visual appeal:** ★★★★★ — Particles pour from above into a 3D container, bounce, settle. Then chute flow begins. Completely different visual character from atomic systems.
**Why include:** Shows ATLAS View handles granular systems too — not just atoms. Visually spectacular.

**Source:** `github.com/lammps/lammps/tree/develop/examples/pour`

**Script modifications:**
```lammps
dump            viz all custom 200 dump.pour.* id type x y z radius
dump_modify     viz sort id
```

**Color strategy:** Color by atom type (different sizes = different colors). Render spheres at true granular radius (much larger than atomic).

**Atom count:** ~10,000 (grows during pour)
**Frames:** ~150

---

## Example 5: Micelle Self-Assembly

**Domain:** Soft matter / Biophysics
**Visual appeal:** ★★★★★ — Random initial distribution of lipid-like molecules spontaneously self-assembles into bilayers and vesicles. Beautiful emergent behavior.
**Why include:** Self-assembly is visually mesmerizing. Shows ATLAS View works for coarse-grained/soft matter.

**Source:** `github.com/lammps/lammps/tree/develop/examples/micelle`

**Script modifications:**
```lammps
dump            viz all custom 500 dump.micelle.* id type x y z
dump_modify     viz sort id
```

**Color strategy:** Color by type — head groups (blue), tail groups (orange), solvent (transparent/gray). The bilayer structure emerges beautifully.

**Atom count:** ~4,800
**Frames:** ~200 (needs longer run for assembly to complete)

---

## Example 6: Couette & Poiseuille Flow

**Domain:** Fluid dynamics / Channel flow
**Visual appeal:** ★★★★ — 2D flow in a channel with clear velocity gradient. Top wall moves, bottom wall stationary. Clean, elegant.
**Why include:** Shows fluid dynamics capability. The velocity profile is immediately recognizable to any physicist.

**Source:** `github.com/lammps/lammps/tree/develop/examples/flow`

**Script modifications:**
```lammps
dump            viz all custom 100 dump.flow.* id type x y z vx vy vz
dump_modify     viz sort id
```

**Color strategy:** Color by x-velocity — clear gradient from wall to center. Use `coolwarm` colormap (blue = slow, red = fast).

**Atom count:** ~8,000
**Frames:** ~100

---

## Example 7: Colloid in Solvent

**Domain:** Colloidal science / Soft matter
**Visual appeal:** ★★★★ — Large spherical colloid particles surrounded by a bath of small solvent particles. The size contrast is visually striking.
**Why include:** Demonstrates multi-scale rendering (big + small particles). Different visual character.

**Source:** `github.com/lammps/lammps/tree/develop/examples/colloid`

**Script modifications:**
```lammps
dump            viz all custom 200 dump.colloid.* id type x y z
dump_modify     viz sort id
```

**Color strategy:** Big colloids rendered as large translucent spheres, solvent as small points. Type-based coloring with size variation.

**Atom count:** ~5,000
**Frames:** ~50

---

## Example 8: Polymer in Water (Tutorial 3)

**Domain:** Polymer science
**Visual appeal:** ★★★★ — A polymer chain (PEG-like) solvated in TIP4P water. The chain coils, unfolds, diffuses. Shows molecular topology (bonds).
**Why include:** Shows bond rendering capability. Polymer + water is a hugely common simulation type.

**Source:** `github.com/lammpstutorials/lammpstutorials-article/tree/main/tutorial-03`
(From the Gravelle et al. LiveCoMS 2025 tutorial set)

**Color strategy:** Polymer chain colored distinctly from water. Bonds rendered as cylinders. Water rendered as small transparent points.

**Atom count:** ~15,000
**Frames:** ~100

---

## Example 9: Carbon Nanotube Tensile Pull

**Domain:** Nanomaterials / Mechanical testing
**Visual appeal:** ★★★★★ — A carbon nanotube stretched until bonds break. Dramatic failure event. Shows bond breaking in real-time.
**Why include:** CNTs are iconic in materials science. The breaking moment is a perfect hero animation.

**Source:** `github.com/lammpstutorials/lammpstutorials-article/tree/main/tutorial-02`
(From the Gravelle et al. LiveCoMS 2025 tutorial set — "Pulling on a Carbon Nanotube")

**Color strategy:** Color by per-atom stress or potential energy. Bonds change color as they stretch toward breaking.

**Atom count:** ~2,000
**Frames:** ~200 (slow pull)

---

## Example 10: Shear Deformation with Void

**Domain:** Plasticity / Defect mechanics
**Visual appeal:** ★★★★ — 2D solid with a void, sheared sideways. Plastic deformation nucleates from the void. Dislocation lines visible.
**Why include:** Void growth is a key failure mechanism. Visually shows how defects propagate.

**Source:** `github.com/lammps/lammps/tree/develop/examples/shear`

**Script modifications:**
```lammps
dump            viz all custom 200 dump.shear.* id type x y z c_peratom
dump_modify     viz sort id
```

**Color strategy:** Color by potential energy — void surface is high energy (red), bulk is blue. Dislocations show as energy ridges.

**Atom count:** ~16,000
**Frames:** ~100

---

## Example 11: Solvated Peptide

**Domain:** Biomolecular / Biochemistry
**Visual appeal:** ★★★★ — Small peptide chain (5-mer) solvated in water. Shows biomolecular capability.
**Why include:** Shows ATLAS View isn't just for materials science — it handles biomolecular systems. Important for breadth.

**Source:** `github.com/lammps/lammps/tree/develop/examples/peptide`

**Color strategy:** Peptide backbone colored by residue, water as transparent small spheres. Show bonds in peptide.

**Atom count:** ~2,004
**Frames:** ~50

---

## Example 12: NaCl Crystal (EIM)

**Domain:** Ionic materials / Ceramics
**Visual appeal:** ★★★★ — Beautiful rock salt crystal structure. Two atom types with alternating colors. Clean, geometric.
**Why include:** Ionic crystals are visually beautiful and immediately recognizable. Shows materials diversity.

**Source:** `github.com/lammps/lammps/tree/develop/examples/eim`

**Color strategy:** Na⁺ = blue, Cl⁻ = green. Classic ionic crystal visualization. Show unit cell wireframe.

**Atom count:** ~8,000
**Frames:** ~20 (static crystal, maybe gentle heating)

---

## Generation Pipeline

### Step 1: Run LAMMPS

```bash
# Install LAMMPS (conda is easiest)
conda create -n lammps -c conda-forge lammps
conda activate lammps

# Clone examples
git clone --depth 1 https://github.com/lammps/lammps.git
cd lammps/examples

# Generate each example's dump files
for example in crack indent melt pour micelle flow colloid shear peptide eim; do
  cd $example
  # Add dump commands if not present (see modifications above)
  lmp -in in.$example
  cd ..
done
```

### Step 2: Clone tutorial examples

```bash
git clone https://github.com/lammpstutorials/lammpstutorials.github.io.git --recurse-submodule
# Run tutorial 2 (CNT) and tutorial 3 (Polymer in water)
```

### Step 3: Package for website

```bash
# Compress each dump set
for example in crack indent melt pour micelle flow colloid shear peptide eim cnt polymer; do
  gzip dump.$example.*
  tar czf examples/$example.tar.gz dump.$example.*.gz log.lammps
done
```

### Step 4: Pre-process for web

For the website, we need each example as:
1. **A single concatenated dump file** (all frames in one file, gzipped)
2. **The corresponding log file** (for thermo sparklines)
3. **A metadata JSON** with:
   - Title, description, domain tag
   - Atom count, frame count
   - Recommended color-by property
   - Recommended colormap
   - Camera position for best initial view
   - Attribution / source reference

```json
{
  "id": "crack",
  "title": "Crack Propagation",
  "description": "A crack tip opens in a 2D EAM copper crystal under mode-I loading. Colored by per-atom potential energy to highlight the stress concentration at the crack tip.",
  "domain": "Fracture Mechanics",
  "atoms": 16900,
  "frames": 100,
  "source": "LAMMPS examples/crack (GPL)",
  "potential": "EAM (Cu)",
  "colorBy": "c_peratom",
  "colormap": "viridis",
  "camera": { "position": [0, 0, 80], "target": [0, 0, 0] },
  "files": {
    "dump": "crack/dump.crack.gz",
    "log": "crack/log.lammps",
    "thumbnail": "crack/thumb.png"
  }
}
```

---

## Website Gallery Layout

The gallery page presents examples as a grid of cards:

```
┌─────────────────────────────────────────────────┐
│  ATLAS View — Example Gallery                    │
│  "Click any example to explore interactively"    │
├────────┬────────┬────────┬────────┬────────┬────┤
│ Crack  │ Indent │  Melt  │  Pour  │Micelle │Flow│
│ ▶ play │ ▶ play │ ▶ play │ ▶ play │▶ play  │▶   │
│ 17K at │ 12K at │ 32K at │ 10K at │ 5K at  │8K  │
├────────┼────────┼────────┼────────┼────────┼────┤
│Colloid │Polymer │  CNT   │ Shear  │Peptide │NaCl│
│ ▶ play │ ▶ play │ ▶ play │ ▶ play │▶ play  │▶   │
│ 5K at  │ 15K at │ 2K at  │ 16K at │ 2K at  │8K  │
└────────┴────────┴────────┴────────┴────────┴────┘
```

Each card shows:
- Animated thumbnail (auto-playing short loop, rendered server-side)
- Title + domain badge
- Atom count + frame count
- "Open in Viewer" button → loads full interactive view

### Hero Section

The homepage hero uses the **Crack Propagation** example as a full-width animated background:
- Auto-rotating slowly
- SSAO + bloom enabled
- Colored by potential energy
- Overlaid with the tagline: *"Drag a file. See your atoms."*

### "Try It Now" Button

Below the gallery, a prominent CTA:
- **"Or drag your own dump file here ↓"**
- Drop zone opens the full viewer with the user's file

---

## Licensing & Attribution

All LAMMPS example scripts are distributed under **GPL v2** as part of the LAMMPS distribution.
The dump files we *generate* from running these scripts are **data**, not software, and are not
subject to GPL. However, we attribute all sources clearly:

```
"This example was generated using the {name} input script from the 
LAMMPS examples distribution (https://github.com/lammps/lammps). 
LAMMPS is developed at Sandia National Laboratories."
```

The LammpsTutorials examples cite:
```
Gravelle, S. et al., "A Set of Tutorials for the LAMMPS Simulation 
Package", Living Journal of Computational Molecular Science, 6(1), 
3037 (2025). DOI: 10.33011/livecoms.6.1.3037
```

---

*Part of ATLAS View — the WebGPU-powered LAMMPS visualization platform.*
