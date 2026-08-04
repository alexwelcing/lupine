#!/usr/bin/env python3
"""Generate scalable LAMMPS elastic-constant input decks for binary alloys.

This is a first-principles generator: it produces `init.mod`, `potential.mod`,
`in.elastic`, `displace.mod`, and copies the potential file from element-level
inputs (mass, lattice type, lattice constant) and a pair-style/pair-coeff
template.  It can generate an arbitrary composition sweep for any binary
system that LAMMPS can represent as a random solid solution on a cubic
lattice.

Example:
    python3 generate_alloy_inputs.py \\
        --system alcu_liu1999 \\
        --elements Al Cu \\
        --structure fcc \\
        --compositions 0.0 0.25 0.50 0.75 1.0 \\
        --solute-index 2 \\
        --pair-style "eam/alloy" \\
        --pair-coeff "* * al-cu-set.eam.alloy Al Cu" \\
        --potential-file al-cu-set.eam.alloy \\
        --output-dir alcu_liu1999
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import Sequence

# Minimal periodic-table data needed to generate inputs from element symbols.
# Atomic masses are standard atomic weights; lattice defaults are for the stable
# cubic allotrope at room temperature.
ELEMENT_DATA: dict[str, dict[str, float | str]] = {
    "Al": {"mass": 26.982, "lattice": "fcc", "a": 4.05},
    "Cu": {"mass": 63.546, "lattice": "fcc", "a": 3.615},
    "Li": {"mass": 6.94, "lattice": "bcc", "a": 3.51},
    "Mg": {"mass": 24.305, "lattice": "hcp", "a": 3.21},
    "Ni": {"mass": 58.693, "lattice": "fcc", "a": 3.52},
    "Fe": {"mass": 55.845, "lattice": "bcc", "a": 2.87},
    "Cr": {"mass": 51.996, "lattice": "bcc", "a": 2.88},
}


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate LAMMPS elastic-constant input decks for binary alloys."
    )
    parser.add_argument("--system", required=True, help="system identifier, e.g. alcu_liu1999")
    parser.add_argument(
        "--elements",
        nargs=2,
        required=True,
        help="Two element symbols in the order they appear in pair_coeff",
    )
    parser.add_argument(
        "--structure",
        choices=["fcc", "bcc"],
        required=True,
        help="Crystal structure to simulate (hcp is not supported by examples/ELASTIC cubic protocol)",
    )
    parser.add_argument(
        "--compositions",
        nargs="+",
        type=float,
        required=True,
        help="Solute fractions (element 2) to generate, e.g. 0.0 0.25 0.5 0.75 1.0",
    )
    parser.add_argument(
        "--solute-index",
        type=int,
        default=2,
        help="LAMMPS atom type assigned to the solute (default 2)",
    )
    parser.add_argument("--pair-style", required=True, help="LAMMPS pair_style line")
    parser.add_argument(
        "--pair-coeff",
        required=True,
        help='LAMMPS pair_coeff line, e.g. "* * al-cu-set.eam.alloy Al Cu"',
    )
    parser.add_argument(
        "--potential-file",
        type=Path,
        required=True,
        help="Path to the potential file to copy into each composition directory",
    )
    parser.add_argument(
        "--lattice-param",
        type=float,
        default=None,
        help="Override lattice constant; default is Vegard interpolation",
    )
    parser.add_argument(
        "--supercell",
        type=int,
        default=4,
        help="Number of conventional cells along each axis",
    )
    parser.add_argument(
        "--template-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "templates",
        help="Directory containing in.elastic and displace.mod templates",
    )
    parser.add_argument(
        "--label-template",
        type=str,
        default="{structure}_{solute_pct}{elem2_lower}",
        help="Directory name template. Available keys: {structure}, {solute_pct}, {solvent_pct}, {elem1}, {elem2}, {elem1_lower}, {elem2_lower}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Root output directory",
    )
    return parser.parse_args(argv)


def label_for_composition(
    template: str,
    structure: str,
    solute_fraction: float,
    elem1: str,
    elem2: str,
) -> str:
    """Build a directory label from the user-supplied template."""
    solute_pct = int(round(solute_fraction * 100))
    solvent_pct = 100 - solute_pct
    return template.format(
        structure=structure,
        solute_pct=f"{solute_pct:02d}",
        solvent_pct=f"{solvent_pct:02d}",
        elem1=elem1,
        elem2=elem2,
        elem1_lower=elem1.lower(),
        elem2_lower=elem2.lower(),
    )


def build_init_mod(
    structure: str,
    a: float,
    elem1: str,
    elem2: str,
    mass1: float,
    mass2: float,
    solute_fraction: float,
    solute_index: int,
    supercell: int,
    seed: int = 12345,
) -> str:
    solvent_index = 1 if solute_index == 2 else 2
    create_cmd = f"create_atoms\t{solvent_index} box"
    set_cmd = ""
    if 0.0 < solute_fraction < 1.0:
        set_cmd = f"set\t\ttype {solvent_index} type/fraction {solute_index} {solute_fraction} {seed}"
    elif solute_fraction >= 1.0:
        create_cmd = f"create_atoms\t{solute_index} box"

    return f"""# Generated by generate_alloy_inputs.py
# {elem1}-{elem2} {structure} random solid solution, solute fraction {solute_fraction:.2f}
units\t\tmetal
variable\tcfac equal 1.0e-4
variable\tcunits string GPa
variable\tup equal 1.0e-6
variable\tatomjiggle equal 1.0e-5

variable\tetol equal 0.0
variable\tftol equal 1.0e-10
variable\tmaxiter equal 100
variable\tmaxeval equal 1000
variable\tdmax equal 1.0e-2

variable\ta equal {a:.6f}

boundary\tp p p
lattice\t\t{structure} $a
region\t\tbox block 0 {supercell} 0 {supercell} 0 {supercell}
create_box\t2 box
{create_cmd}
{set_cmd}
mass\t\t1 {mass1:.6f}
mass\t\t2 {mass2:.6f}
"""


def build_potential_mod(pair_style: str, pair_coeff: str) -> str:
    return f"""# Generated by generate_alloy_inputs.py
pair_style\t{pair_style}
pair_coeff\t{pair_coeff}

neighbor\t1.0 nsq
neigh_modify\tonce no every 1 delay 0 check yes

min_style\tcg
min_modify\tdmax ${{dmax}} line quadratic

thermo\t\t1
thermo_style\tcustom step temp pe press pxx pyy pzz pxy pxz pyz lx ly lz vol
thermo_modify\tnorm no
"""


def generate(args: argparse.Namespace) -> list[Path]:
    elem1, elem2 = args.elements
    data1 = ELEMENT_DATA.get(elem1)
    data2 = ELEMENT_DATA.get(elem2)
    if data1 is None or data2 is None:
        raise SystemExit(
            f"Unknown element(s).  Add data to ELEMENT_DATA for: {set(args.elements) - set(ELEMENT_DATA)}"
        )

    if not args.potential_file.exists():
        raise SystemExit(f"Potential file not found: {args.potential_file}")

    template_in = args.template_dir / "in.elastic"
    template_disp = args.template_dir / "displace.mod"
    if not template_in.exists() or not template_disp.exists():
        raise SystemExit(
            f"Template files missing: expected {template_in} and {template_disp}"
        )

    generated: list[Path] = []
    for frac in args.compositions:
        if not (0.0 <= frac <= 1.0):
            raise SystemExit(f"Composition fraction {frac} is outside [0, 1]")

        if args.lattice_param is not None:
            a = args.lattice_param
        else:
            # Vegard-rule interpolation between the two pure-element lattice constants.
            a1 = float(data1["a"])  # type: ignore[arg-type]
            a2 = float(data2["a"])  # type: ignore[arg-type]
            a = a1 * (1.0 - frac) + a2 * frac

        comp_label = label_for_composition(
            args.label_template, args.structure, frac, elem1, elem2
        )
        out = args.output_dir / comp_label
        out.mkdir(parents=True, exist_ok=True)

        init = build_init_mod(
            structure=args.structure,
            a=a,
            elem1=elem1,
            elem2=elem2,
            mass1=float(data1["mass"]),  # type: ignore[arg-type]
            mass2=float(data2["mass"]),  # type: ignore[arg-type]
            solute_fraction=frac,
            solute_index=args.solute_index,
            supercell=args.supercell,
        )
        (out / "init.mod").write_text(init)
        (out / "potential.mod").write_text(build_potential_mod(args.pair_style, args.pair_coeff))
        shutil.copy2(template_in, out / "in.elastic")
        shutil.copy2(template_disp, out / "displace.mod")
        shutil.copy2(args.potential_file, out / args.potential_file.name)

        generated.append(out)
        print(f"Generated {out}")

    return generated


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        generate(args)
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
