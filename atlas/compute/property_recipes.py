#!/usr/bin/env python3
"""
property_recipes.py — Property-extensible LAMMPS calculator library.

Phase-D Layer-4 of the locked hypothesis-loop architecture: the
property-extensible compute engine that lets the loop *identify and
validate NEW material properties with real physics*, not just the
elastic constants the corpus is currently myopic on.

Each Recipe knows how to (a) build a complete LAMMPS input script that
COMPUTES one named property and (b) extract that property's value from
the resulting LAMMPS log text via a unique parseable sentinel
(`PROP <name> = <value>`).

LAMMPS conventions (units metal):
    energy   -> eV
    distance -> Angstrom
    pressure -> bars      (convert to GPa: x 1e-4)
    1 eV/Angstrom^2       = 16.0218 J/m^2

Pure module: no network, no LAMMPS calls at import, no side effects.
LAMMPS is invoked by the runner (via the `lammps` python module), NOT
here — this file only builds scripts + parses logs as text. Stdlib
only (re / math / dataclasses).

The pair_style->pair_coeff mapping and lattice-line handling are
mirrored EXACTLY from atlas/scripts/generate_nist_demos.py — diverging
would mean wrong physics.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Callable

# ─── Unit conversion constants ──────────────────────────────────────────

BARS_TO_GPA = 1.0e-4          # LAMMPS metal pressure is in bars
EV_A2_TO_J_M2 = 16.0218       # eV/Angstrom^2 -> J/m^2

# ─── Shared LAMMPS fragment builders (mirror generate_nist_demos.py) ─────


def _lattice_line(structure: str, lattice: float) -> str:
    """Emit the `lattice` line. Mirrors generate_nist_demos.py exactly:
    fcc/bcc/hcp/diamond recognised; anything else falls back to fcc."""
    s = structure.lower()
    if s in ("fcc", "bcc", "hcp", "diamond"):
        return f"lattice {s} {lattice}"
    return f"lattice fcc {lattice}"


def _pair_coeff_lines(
    potential: dict,
    potential_file: str,
    library_file: str | None = None,
) -> list[str]:
    """Return the `pair_style` + `pair_coeff` lines for this potential.

    This is a verbatim port of the per-family mapping in
    generate_nist_demos.generate_lammps_input — wrong pair_coeff is
    wrong physics, so it must NOT diverge.
    """
    elements = potential["elements"]
    pair_style = potential["pair_style"]
    abs_fname = str(potential_file).replace("\\", "/")
    els = " ".join(elements)

    lines = [f"pair_style {pair_style}"]
    if pair_style in ("eam/alloy", "eam/fs", "eam/cd", "eam/he"):
        lines.append(f'pair_coeff * * "{abs_fname}" {els}')
    elif pair_style == "eam":
        # eam uses individual files per type
        lines.append(f'pair_coeff * * "{abs_fname}"')
    elif pair_style in ("meam", "meam/spline"):
        if library_file:
            abs_lib = str(library_file).replace("\\", "/")
            # MEAM syntax: pair_coeff * * lib.el els... param.el els...
            lines.append(
                f'pair_coeff * * "{abs_lib}" {els} "{abs_fname}" {els}'
            )
        else:
            # Fallback: hope the single file works (will likely fail)
            lines.append(f'pair_coeff * * "{abs_fname}" {els} {els}')
    elif pair_style in ("tersoff", "sw", "bop", "vashishta", "comb3"):
        lines.append(f'pair_coeff * * "{abs_fname}" {els}')
    elif pair_style == "adp":
        lines.append(f'pair_coeff * * "{abs_fname}" {els}')
    elif pair_style == "reax/c":
        lines.append(f'pair_coeff * * "{abs_fname}"')
    else:
        lines.append(f'pair_coeff * * "{abs_fname}"')
    return lines


def _header(potential: dict, recipe_name: str) -> list[str]:
    """Common preamble shared by every recipe."""
    return [
        f"# property_recipes :: {recipe_name}",
        f"# Potential: {potential.get('id', '?')}",
        "units metal",
        "atom_style atomic",
        "boundary p p p",
        "",
    ]


def _log_path(workdir: str, recipe_name: str) -> str:
    """Deterministic per-recipe log path (forward-slashed for LAMMPS)."""
    wd = str(workdir).replace("\\", "/").rstrip("/")
    return f"{wd}/log.{recipe_name}.lammps"


def _build_block(
    structure: str, lattice: float, supercell: int
) -> list[str]:
    """Create a periodic supercell crystal of a single atom type."""
    return [
        _lattice_line(structure, lattice),
        f"region box block 0 {supercell} 0 {supercell} 0 {supercell}",
        "create_box 1 box",
        "create_atoms 1 box",
    ]


# Sentinel parser: matches `PROP <name> = <number>` anywhere in the log.
_SENTINEL_RE = re.compile(
    r"PROP\s+([A-Za-z_]\w*)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)"
)


def _parse_sentinels(log_text: str) -> dict[str, float]:
    """Extract every `PROP name = value` pair from log text.

    Later occurrences win (final relaxed value supersedes intermediate).
    """
    out: dict[str, float] = {}
    for m in _SENTINEL_RE.finditer(log_text):
        try:
            out[m.group(1)] = float(m.group(2))
        except ValueError:
            continue
    return out


# ─── Recipe dataclass ───────────────────────────────────────────────────


@dataclass(frozen=True)
class Recipe:
    """One named-property compute recipe.

    Attributes
    ----------
    name      : recipe key (== the `lammps_input_type` from the spec)
    property  : corpus property name written back (a0/E_coh/C11/...)
                multi-valued recipes (elastic) emit several keys; this
                holds the canonical/primary one for display.
    unit      : physical unit of the extracted value(s)
    _build    : (potential, potential_file, structure, lattice,
                 workdir, supercell) -> full LAMMPS script string
    _extract  : (log_text) -> {property: value}; {} on failure
    """

    name: str
    property: str
    unit: str
    _build: Callable[[dict, str, str, float, str, int], str]
    _extract: Callable[[str], dict[str, float]]

    def build_input(
        self,
        potential: dict,
        potential_file: str,
        structure: str,
        lattice: float,
        workdir: str,
        supercell: int = 4,
    ) -> str:
        """Return the full LAMMPS script string for this recipe."""
        return self._build(
            potential, potential_file, structure, lattice,
            workdir, supercell,
        )

    def extract(self, log_text: str) -> dict[str, float]:
        """Parse the sentinel(s); return {property: value} or {}."""
        try:
            return self._extract(log_text)
        except Exception:
            return {}


# ─── Recipe: lattice_constant -> a0 ──────────────────────────────────────
# Method: relax cell+atoms with `fix box/relax iso 0.0` + minimize, then
# the equilibrium conventional lattice parameter is lx / supercell
# (Angstrom). property "a0".


def _build_lattice_constant(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "lattice_constant")
    lines = _header(potential, "lattice_constant")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Full anisotropic-free isotropic cell relax + atomic relax",
        "fix relax all box/relax iso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix relax",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "",
        f"variable a0 equal lx/{supercell}",
        'print "PROP a0 = ${a0}"',
    ]
    return "\n".join(lines) + "\n"


def _extract_lattice_constant(log_text):
    s = _parse_sentinels(log_text)
    if "a0" in s and math.isfinite(s["a0"]) and s["a0"] > 0:
        return {"a0": s["a0"]}
    return {}


# ─── Recipe: cohesive_energy -> E_coh ────────────────────────────────────
# Method: relax cell+atoms, read potential energy per atom (eV/atom).
# Sign convention: the corpus stores cohesive energy as a negative
# number equal to the relaxed pe/atom (E_coh = pe/N, which is < 0 for a
# bound crystal). We emit pe/atom directly. property "E_coh".


def _build_cohesive_energy(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "cohesive_energy")
    lines = _header(potential, "cohesive_energy")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "fix relax all box/relax iso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix relax",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "",
        "variable ecoh equal pe/atoms",
        'print "PROP E_coh = ${ecoh}"',
    ]
    return "\n".join(lines) + "\n"


def _extract_cohesive_energy(log_text):
    s = _parse_sentinels(log_text)
    if "E_coh" in s and math.isfinite(s["E_coh"]):
        return {"E_coh": s["E_coh"]}
    return {}


# ─── Recipe: elastic_constants -> C11, C12, C44 ──────────────────────────
# Method: relax the reference cell, then apply small +/- finite strains
# and finite-difference the stress.
#   C11 = d(sigma_xx)/d(eps_xx)   (uniaxial xx strain)
#   C12 = d(sigma_yy)/d(eps_xx)   (transverse response to xx strain)
#   C44 = d(sigma_xy)/d(eps_xy)   (simple shear, engineering->tensor /2)
# LAMMPS pressure is in bars; stress = -pressure. Central difference
# over +/- eps. bars -> GPa via x 1e-4. property emits 3 keys.

_ELASTIC_EPS = 1.0e-3  # dimensionless strain amplitude


def _build_elastic_constants(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "elastic_constants")
    eps = _ELASTIC_EPS
    # Strategy: relax a reference state, snapshot it to a restart, then
    # run four INDEPENDENT strained branches (+/- eps_xx, +/- eps_xy),
    # each re-reading the relaxed reference so strains never accumulate.
    lines = _header(potential, "elastic_constants")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Relax reference state fully (cell + atoms)",
        "fix rlx all box/relax aniso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix rlx",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "",
        "# Snapshot the relaxed reference configuration",
        "write_restart {}/ref.elastic.restart".format(
            str(workdir).replace("\\", "/").rstrip("/")
        ),
        "",
        f"variable e equal {eps}",
        "variable tol equal 1.0e-10",
        "",
        "# ---- +eps_xx (uniaxial x) ----",
        "change_box all x scale $(1.0+v_e) remap units box",
        "minimize ${tol} ${tol} 10000 100000",
        'print "PROP sxx_p = $(-pxx)"',
        'print "PROP syy_p = $(-pyy)"',
        "",
        "# ---- -eps_xx : restore then apply opposite strain ----",
        "clear",
    ]
    # After `clear` we must rebuild from the relaxed restart.
    rd = str(workdir).replace("\\", "/").rstrip("/")
    lines += [
        "units metal",
        "atom_style atomic",
        f'read_restart {rd}/ref.elastic.restart',
    ]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        f"variable e equal {eps}",
        "variable tol equal 1.0e-10",
        "change_box all x scale $(1.0-v_e) remap units box",
        "minimize ${tol} ${tol} 10000 100000",
        'print "PROP sxx_m = $(-pxx)"',
        'print "PROP syy_m = $(-pyy)"',
        "",
        "# ---- +eps_xy simple shear ----",
        "clear",
        "units metal",
        "atom_style atomic",
        f'read_restart {rd}/ref.elastic.restart',
    ]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        f"variable e equal {eps}",
        "variable tol equal 1.0e-10",
        "change_box all xy delta $(v_e*ly) remap units box",
        "minimize ${tol} ${tol} 10000 100000",
        'print "PROP sxy_p = $(-pxy)"',
        "",
        "# ---- -eps_xy simple shear ----",
        "clear",
        "units metal",
        "atom_style atomic",
        f'read_restart {rd}/ref.elastic.restart',
    ]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        f"variable e equal {eps}",
        "variable tol equal 1.0e-10",
        "change_box all xy delta $(-v_e*ly) remap units box",
        "minimize ${tol} ${tol} 10000 100000",
        'print "PROP sxy_m = $(-pxy)"',
    ]
    return "\n".join(lines) + "\n"


def _extract_elastic_constants(log_text):
    s = _parse_sentinels(log_text)
    need = ("sxx_p", "syy_p", "sxx_m", "syy_m", "sxy_p", "sxy_m")
    if not all(k in s for k in need):
        return {}
    eps = _ELASTIC_EPS
    # Central difference of stress (bars) over the +/- strain pair,
    # then bars -> GPa.
    c11 = ((s["sxx_p"] - s["sxx_m"]) / (2.0 * eps)) * BARS_TO_GPA
    c12 = ((s["syy_p"] - s["syy_m"]) / (2.0 * eps)) * BARS_TO_GPA
    # Engineering shear strain applied (xy = e*ly => gamma = e). For the
    # tensor elastic constant C44 = sigma_xy / eps_xy where the tensor
    # shear strain eps_xy = gamma/2; central difference of sigma_xy over
    # +/- gamma gives d(sigma_xy)/d(gamma) = C44 (Voigt) directly.
    c44 = ((s["sxy_p"] - s["sxy_m"]) / (2.0 * eps)) * BARS_TO_GPA
    out = {"C11": c11, "C12": c12, "C44": c44}
    if not all(math.isfinite(v) for v in out.values()):
        return {}
    return out


# ─── Recipe: bulk_modulus -> B0 (E-V parabola fit) ───────────────────────
# Method: scan cell volume around the relaxed minimum, relax atoms at
# each fixed volume, fit E(V) to a parabola.  Near the minimum
# E(V) ~ E0 + 0.5 * (B0/V0) * (V - V0)^2  =>  B0 = V0 * d2E/dV2.
# Independent of the elastic-constants recipe (no C_ij used). bars->GPa
# is irrelevant here: B0 from eV & Angstrom^3 needs eV/A^3 -> GPa.
EV_A3_TO_GPA = 160.21766208  # 1 eV/Angstrom^3 = 160.218 GPa


def _build_bulk_modulus(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "bulk_modulus")
    lines = _header(potential, "bulk_modulus")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Relax to the equilibrium volume first",
        "fix rlx all box/relax iso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix rlx",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "",
        'print "PROP V0 = $(vol)"',
        'print "PROP E0 = $(pe)"',
        "",
        "# Five-point E-V scan: linear scale s on each box edge so that",
        "# volume V = V0 * s^3. Atoms relax at each fixed cell.",
        "variable tol equal 1.0e-10",
    ]
    # Linear scale factors -> isotropic volume change. Each branch reads
    # the relaxed reference back so points are independent.
    rd = str(workdir).replace("\\", "/").rstrip("/")
    lines += [
        "write_restart {}/ref.bulk.restart".format(rd),
    ]
    for tag, s_lin in (("m2", 0.990), ("m1", 0.995),
                       ("p1", 1.005), ("p2", 1.010)):
        lines += [
            "",
            "clear",
            "units metal",
            "atom_style atomic",
            f"read_restart {rd}/ref.bulk.restart",
        ]
        lines += _pair_coeff_lines(potential, potential_file)
        lines += [
            "neighbor 2.0 bin",
            "neigh_modify delay 5 every 1",
            "variable tol equal 1.0e-10",
            f"change_box all x scale {s_lin} y scale {s_lin} "
            f"z scale {s_lin} remap units box",
            "minimize ${tol} ${tol} 10000 100000",
            f'print "PROP V_{tag} = $(vol)"',
            f'print "PROP E_{tag} = $(pe)"',
        ]
    return "\n".join(lines) + "\n"


def _extract_bulk_modulus(log_text):
    s = _parse_sentinels(log_text)
    keys = ("V_m2", "E_m2", "V_m1", "E_m1", "V0", "E0",
            "V_p1", "E_p1", "V_p2", "E_p2")
    if not all(k in s for k in keys):
        return {}
    vs = [s["V_m2"], s["V_m1"], s["V0"], s["V_p1"], s["V_p2"]]
    es = [s["E_m2"], s["E_m1"], s["E0"], s["E_p1"], s["E_p2"]]
    if any(not math.isfinite(x) for x in vs + es):
        return {}
    # Least-squares quadratic fit E = a*V^2 + b*V + c (5 points).
    n = len(vs)
    sV = sum(vs)
    sV2 = sum(v * v for v in vs)
    sV3 = sum(v ** 3 for v in vs)
    sV4 = sum(v ** 4 for v in vs)
    sE = sum(es)
    sVE = sum(v * e for v, e in zip(vs, es))
    sV2E = sum(v * v * e for v, e in zip(vs, es))
    # Normal equations matrix M [a b c]^T = R
    m = [
        [sV4, sV3, sV2],
        [sV3, sV2, sV],
        [sV2, sV, float(n)],
    ]
    r = [sV2E, sVE, sE]
    sol = _solve3(m, r)
    if sol is None:
        return {}
    a, b, _c = sol
    if a <= 0:
        return {}
    v0 = -b / (2.0 * a)            # parabola minimum volume
    d2e_dv2 = 2.0 * a             # eV / Angstrom^6
    if v0 <= 0:
        return {}
    b0_ev_a3 = v0 * d2e_dv2       # eV / Angstrom^3
    b0_gpa = b0_ev_a3 * EV_A3_TO_GPA
    if not math.isfinite(b0_gpa) or b0_gpa <= 0:
        return {}
    return {"B0": b0_gpa}


def _solve3(m: list[list[float]], r: list[float]) -> list[float] | None:
    """Solve a 3x3 linear system by Cramer's rule. None if singular."""

    def det3(a):
        return (
            a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
            - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
            + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
        )

    d = det3(m)
    if abs(d) < 1e-30:
        return None
    out = []
    for col in range(3):
        mc = [row[:] for row in m]
        for row in range(3):
            mc[row][col] = r[row]
        out.append(det3(mc) / d)
    return out


# ─── Recipe: vacancy_energy -> E_vac ─────────────────────────────────────
# Method: E_vac = E(N-1, one atom deleted, relaxed)
#                 - ((N-1)/N) * E(perfect, relaxed).
# Both at fixed (relaxed-perfect) cell; atoms relaxed, cell fixed for the
# defected run (standard isochoric vacancy formation energy). eV.


def _build_vacancy_energy(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "vacancy_energy")
    rd = str(workdir).replace("\\", "/").rstrip("/")
    lines = _header(potential, "vacancy_energy")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Relax the perfect crystal (cell + atoms)",
        "fix rlx all box/relax iso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix rlx",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "",
        'print "PROP N_perf = $(count(all))"',
        'print "PROP E_perf = $(pe)"',
        f"write_restart {rd}/ref.vac.restart",
        "",
        "# Defected: delete one atom, hold cell, relax atoms only",
        "clear",
        "units metal",
        "atom_style atomic",
        f"read_restart {rd}/ref.vac.restart",
    ]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "group del id 1",
        "delete_atoms group del compress yes",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        'print "PROP E_def = $(pe)"',
        'print "PROP N_def = $(count(all))"',
    ]
    return "\n".join(lines) + "\n"


def _extract_vacancy_energy(log_text):
    s = _parse_sentinels(log_text)
    if not all(k in s for k in ("N_perf", "E_perf", "E_def")):
        return {}
    n = s["N_perf"]
    if n <= 1 or not math.isfinite(n):
        return {}
    e_vac = s["E_def"] - ((n - 1.0) / n) * s["E_perf"]
    if not math.isfinite(e_vac):
        return {}
    return {"E_vac": e_vac}


# ─── Recipe: surface_energy -> gamma_surf ────────────────────────────────
# Method: gamma = (E_slab - E_bulk) / (2 * A), where the slab is created
# by switching the z boundary to shrink-wrapped ("s") with vacuum, so
# two free surfaces of area A = lx*ly are exposed. eV/A^2 -> J/m^2.


def _build_surface_energy(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "surface_energy")
    rd = str(workdir).replace("\\", "/").rstrip("/")
    lines = _header(potential, "surface_energy")
    lines += [f'log "{log}"']
    lines += _build_block(structure, lattice, supercell)
    lines += [""]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Bulk reference (fully periodic), relax cell + atoms",
        "fix rlx all box/relax iso 0.0 vmax 0.001",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        "unfix rlx",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        'print "PROP E_bulk = $(pe)"',
        'print "PROP area = $(lx*ly)"',
        f"write_restart {rd}/ref.surf.restart",
        "",
        "# Slab: re-read, open the z boundary (p p s) + add vacuum,",
        "# relax atoms at fixed (now non-periodic-z) cell.",
        "clear",
        "units metal",
        "atom_style atomic",
        f"read_restart {rd}/ref.surf.restart",
        "change_box all boundary p p s z delta -20.0 20.0 units box",
    ]
    lines += _pair_coeff_lines(potential, potential_file)
    lines += [
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "minimize 1.0e-10 1.0e-10 10000 100000",
        'print "PROP E_slab = $(pe)"',
    ]
    return "\n".join(lines) + "\n"


def _extract_surface_energy(log_text):
    s = _parse_sentinels(log_text)
    if not all(k in s for k in ("E_bulk", "area", "E_slab")):
        return {}
    area = s["area"]
    if area <= 0 or not math.isfinite(area):
        return {}
    gamma_ev_a2 = (s["E_slab"] - s["E_bulk"]) / (2.0 * area)
    gamma = gamma_ev_a2 * EV_A2_TO_J_M2
    if not math.isfinite(gamma):
        return {}
    return {"gamma_surf": gamma}


# ─── Recipe: stacking_fault -> gamma_sf (honest stub) ────────────────────
# A robust generalized stacking-fault (GSF) template requires
# crystallographic slip-plane construction (e.g. FCC {111}<112>) that is
# structure- and orientation-specific and not safely generalizable from
# the single-type cubic builder used here. Rather than emit physics we
# cannot trust, this recipe builds a minimal script that logs an honest
# "not yet implemented" marker and extract() returns {} so the runner
# skips it gracefully (instead of writing a fabricated number back to
# the corpus).


def _build_stacking_fault(
    potential, potential_file, structure, lattice, workdir, supercell
):
    log = _log_path(workdir, "stacking_fault")
    lines = _header(potential, "stacking_fault")
    lines += [
        f'log "{log}"',
        'print "stacking_fault recipe not yet implemented"',
        'print "PROP gamma_sf_status = 0"',
    ]
    return "\n".join(lines) + "\n"


def _extract_stacking_fault(log_text):
    # Intentionally always {} — honest non-implementation, runner skips.
    return {}


# ─── Registry ───────────────────────────────────────────────────────────

RECIPES: dict[str, Recipe] = {
    "lattice_constant": Recipe(
        name="lattice_constant",
        property="a0",
        unit="angstrom",
        _build=_build_lattice_constant,
        _extract=_extract_lattice_constant,
    ),
    "cohesive_energy": Recipe(
        name="cohesive_energy",
        property="E_coh",
        unit="eV/atom",
        _build=_build_cohesive_energy,
        _extract=_extract_cohesive_energy,
    ),
    "elastic_constants": Recipe(
        name="elastic_constants",
        property="C11",  # also emits C12, C44
        unit="GPa",
        _build=_build_elastic_constants,
        _extract=_extract_elastic_constants,
    ),
    "bulk_modulus": Recipe(
        name="bulk_modulus",
        property="B0",
        unit="GPa",
        _build=_build_bulk_modulus,
        _extract=_extract_bulk_modulus,
    ),
    "vacancy_energy": Recipe(
        name="vacancy_energy",
        property="E_vac",
        unit="eV",
        _build=_build_vacancy_energy,
        _extract=_extract_vacancy_energy,
    ),
    "surface_energy": Recipe(
        name="surface_energy",
        property="gamma_surf",
        unit="J/m^2",
        _build=_build_surface_energy,
        _extract=_extract_surface_energy,
    ),
    "stacking_fault": Recipe(
        name="stacking_fault",
        property="gamma_sf",
        unit="mJ/m^2",
        _build=_build_stacking_fault,
        _extract=_extract_stacking_fault,
    ),
}


def get_recipe(lammps_input_type: str) -> Recipe | None:
    """Look up a Recipe by the spec's `lammps_input_type`.

    Returns None for an unknown key so the runner can skip + log
    instead of crashing.
    """
    if not isinstance(lammps_input_type, str):
        return None
    return RECIPES.get(lammps_input_type.strip())


__all__ = ["Recipe", "RECIPES", "get_recipe"]
