"""Run the pre-registered 4x2 (architecture x functional) elastic-constant cells.

Eight MatPES-trained matgl models through the IDENTICAL local strain-energy
harness used for the original MACE/CHGNet/Orb trio (mlip_immi/elastic_constants.py).
One JSON per cell, same schema as mace_results.json.

Pre-registration: prereg_functional_vs_architecture_2x2.md (committed dffbe5958
before execution).
"""

import json
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, r"C:\Users\alexw\Downloads\shed\mlip_immi")
import elastic_constants as ec  # noqa: E402

import matgl  # noqa: E402
from matgl.ext.ase import PESCalculator  # noqa: E402

PKG = Path(__file__).parent

CELLS = [
    # (cell_id, architecture, functional, matgl model name)
    ("m3gnet_pbe",    "M3GNet",    "PBE",    "M3GNet-PES-MatPES-PBE-2025.2"),
    ("m3gnet_r2scan", "M3GNet",    "r2SCAN", "M3GNet-PES-MatPES-r2SCAN-2025.2"),
    ("tensornet_pbe",    "TensorNet", "PBE",    "TensorNet-PES-MatPES-PBE-2025.2"),
    ("tensornet_r2scan", "TensorNet", "r2SCAN", "TensorNet-PES-MatPES-r2SCAN-2025.2"),
    ("chgnet_matpes_pbe",    "CHGNet", "PBE",    "CHGNet-PES-MatPES-PBE-2025.2.10"),
    ("chgnet_matpes_r2scan", "CHGNet", "r2SCAN", "CHGNet-PES-MatPES-r2SCAN-2025.2.10"),
    ("qet_pbe",    "QET", "PBE",    "QET-PES-MatPES-PBE-2025.2"),
    ("qet_r2scan", "QET", "r2SCAN", "QET-PES-MatPES-r2SCAN-2025.2"),
]

ELEMENTS = list(ec.CRYSTAL_STRUCTURE.keys())

for cell_id, arch, func, model_name in CELLS:
    out_path = PKG / f"cell_{cell_id}.json"
    if out_path.exists():
        print(f"[skip] {cell_id} already done")
        continue
    print(f"\n===== CELL {cell_id} ({arch} x {func}) — {model_name} =====", flush=True)
    t0 = time.time()
    try:
        pot = matgl.load_model(model_name)
        calc = PESCalculator(pot)
    except Exception:
        print(f"[FAIL] could not load {model_name}:")
        traceback.print_exc()
        continue
    results = []
    for el in ELEMENTS:
        try:
            r = ec.compute_elastic_constants(el, calc)
            results.append({
                "element": r.element, "structure": r.structure,
                "a0_optimized": r.a0_optimized,
                "C11": r.C11, "C12": r.C12, "C44": r.C44,
                "bulk_modulus_GPa": r.bulk_modulus,
                "R2_iso": r.R2_iso, "R2_volconst": r.R2_volconst, "R2_shear": r.R2_shear,
                "elapsed_s": r.elapsed_s, "failures": r.failures,
            })
            flag = " !! " + "; ".join(r.failures) if r.failures else ""
            print(f"  {el:3s} C=({r.C11:7.1f},{r.C12:7.1f},{r.C44:7.1f}) "
                  f"[{r.elapsed_s:.1f}s]{flag}", flush=True)
        except Exception as e:
            print(f"  {el:3s} FAILED: {e}", flush=True)
            results.append({"element": el, "error": str(e)})
    payload = {
        "cell": cell_id,
        "architecture": arch,
        "functional": func,
        "model": model_name,
        "method": "strain-energy, eps_max=0.5% (identical harness to mace_results.json)",
        "matgl_version": matgl.__version__,
        "prereg": "prereg_functional_vs_architecture_2x2.md @ dffbe5958",
        "results": results,
    }
    out_path.write_text(json.dumps(payload, indent=2))
    print(f"[done] {cell_id} in {time.time()-t0:.0f}s -> {out_path.name}", flush=True)

print("\nAll cells attempted.")
