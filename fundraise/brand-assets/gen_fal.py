#!/usr/bin/env python
"""Generate Lupine deck hero stills via FAL (flux-2-pro), palette-locked to the
DECK brand (warm paper #faf9f6 + indigo #3d4db3) so they composite cleanly.
Calls the fal-assets helper per concept. Run: python gen_fal.py
"""
import json, os, subprocess, sys

FALPY = os.path.expanduser("~/.claude/skills/fal-assets/fal.py")
MODEL = "fal-ai/flux-2-pro"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fal")
os.makedirs(OUT, exist_ok=True)

STYLE = ("Abstract scientific illustration, editorial minimalism like a figure in a "
         "beautiful physics monograph. Warm off-white cream paper background (hex #faf9f6). "
         "Thin precise lines in a single indigo accent (hex #3d4db3). Very low contrast, "
         "vast negative space, calm, premium, restrained. No text, no words, no people, "
         "no flowers, no logos, not photographic, no neon, no glow.")

CONCEPTS = [
    ("cover-shape-of-wrongness",
     "Many faint thin indigo directional line segments scattered across the field, gracefully "
     "converging and aligning onto a single smooth luminous indigo ribbon curve sweeping through "
     "the right side; structure emerging from scatter. " + STYLE),
    ("bridge",
     "A single luminous indigo arc bridging a crystalline atomic lattice on the left, through a "
     "faint field of small digital squares in the middle, to a crystalline lattice on the right; "
     "atoms to bits to atoms. " + STYLE),
    ("vision-replicator-arc",
     "Matter coalescing out of faint indigo particles and light along a sweeping horizon arc, "
     "ordered crystalline structure assembling; expansive, cinematic yet restrained. " + STYLE),
    ("hyper-ribbon",
     "A single elegant low-dimensional luminous indigo ribbon sheet folded gracefully in space, "
     "with faint scattered points converging onto its surface. " + STYLE),
    ("bits-to-atoms",
     "A field of tiny faint indigo pixels on the left dissolving and re-forming into a precise "
     "crystalline atomic lattice of indigo nodes joined by thin bonds on the right. " + STYLE),
]

def main() -> int:
    for name, prompt in CONCEPTS:
        payload = json.dumps({"prompt": prompt, "image_size": "landscape_16_9", "num_images": 2})
        print(f"\n=== {name} ===", flush=True)
        r = subprocess.run([sys.executable, FALPY, MODEL, payload, "--out", OUT, "--name", name])
        if r.returncode != 0:
            print(f"  (failed: {name})", flush=True)
    print("\nFAL GEN DONE ->", OUT)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
