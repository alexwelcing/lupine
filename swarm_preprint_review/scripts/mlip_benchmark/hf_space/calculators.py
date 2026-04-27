"""Universal-MLIP calculator factory with lazy imports.

Each MLIP family (CHGNet, MACE-MP, M3GNet) is wrapped so the import only
happens when the calculator is requested — the harness can be tested in
environments where only a subset of the models is installed.
"""
from __future__ import annotations

from typing import Callable

# Mapping from canonical MLIP id → (display name, ASE-Calculator factory).
# Each factory raises ImportError with an actionable install hint if the
# underlying package isn't available.

def _chgnet_factory():
    try:
        from chgnet.model.dynamics import CHGNetCalculator  # type: ignore
    except ImportError as e:
        raise ImportError(
            "chgnet is not installed. Install with `pip install chgnet`. "
            "On CPU-only hosts this is ~700 MB."
        ) from e
    return CHGNetCalculator()


def _mace_mp0_factory():
    try:
        from mace.calculators import mace_mp  # type: ignore
    except ImportError as e:
        raise ImportError(
            "mace-torch is not installed. Install with "
            "`pip install mace-torch`. The default MACE-MP-0 weights are "
            "downloaded on first use (~300 MB)."
        ) from e
    return mace_mp(model="medium", default_dtype="float32")


def _m3gnet_factory():
    try:
        import matgl  # type: ignore
        from matgl.ext.ase import PESCalculator  # type: ignore
    except ImportError as e:
        raise ImportError(
            "matgl (M3GNet) is not installed. Install with `pip install matgl`. "
            "The M3GNet-MP-2021.2.8-PES checkpoint downloads on first use."
        ) from e
    pot = matgl.load_model("M3GNet-MP-2021.2.8-PES")
    return PESCalculator(pot)


def _emt_factory():
    """Effective Medium Theory — built into ASE, no install needed.

    Useful for smoke-testing the harness plumbing on Cu, Ag, Au, Ni, Pd, Pt,
    Al, Pb (the EMT element list). NOT a defensible MLIP comparator — only
    for pipeline validation.
    """
    from ase.calculators.emt import EMT
    return EMT()


CALCULATORS: dict[str, tuple[str, Callable]] = {
    "chgnet": ("CHGNet (Deng 2023)", _chgnet_factory),
    "mace_mp0": ("MACE-MP-0 (Batatia 2024)", _mace_mp0_factory),
    "m3gnet": ("M3GNet-MP-2021 (Chen & Ong 2022)", _m3gnet_factory),
    "emt": ("ASE EMT (smoke-test only)", _emt_factory),
}


def available() -> list[str]:
    """Return the list of MLIP ids that can be loaded right now (no errors)."""
    out: list[str] = []
    for mlip_id, (_label, factory) in CALCULATORS.items():
        try:
            factory()
        except (ImportError, Exception):  # noqa: BLE001 — checking availability
            continue
        out.append(mlip_id)
    return out


def make_calculator(mlip_id: str):
    """Construct an ASE Calculator for the given MLIP id."""
    if mlip_id not in CALCULATORS:
        raise ValueError(f"unknown MLIP '{mlip_id}'; choices: {sorted(CALCULATORS)}")
    _label, factory = CALCULATORS[mlip_id]
    return factory()
