"""Universal-MLIP calculator factory with lazy imports + runtime install.

Each MLIP family (CHGNet, MACE-MP, M3GNet) is wrapped so the import only
happens when the calculator is requested. If the package is missing, we
attempt a runtime `pip install` so the Space can stay lightweight at build
time and pull in heavy deps (~2 GB torch + models) on first use.
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from typing import Callable


def _ensure_installed(package_spec: str, import_name: str | None = None) -> None:
    """Install a pip package if its top-level module is not importable."""
    name = import_name or package_spec.split("==")[0].split("[")[0].replace("-", "_")
    if importlib.util.find_spec(name) is not None:
        return
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", package_spec],
        check=True,
    )


def _chgnet_factory():
    _ensure_installed("chgnet==0.4.0", "chgnet")
    from chgnet.model.dynamics import CHGNetCalculator  # type: ignore
    return CHGNetCalculator()


def _mace_mp0_factory():
    _ensure_installed("mace-torch==0.3.6", "mace")
    from mace.calculators import mace_mp  # type: ignore
    return mace_mp(model="medium", default_dtype="float32")


def _m3gnet_factory():
    _ensure_installed("matgl==1.1.3", "matgl")
    import matgl  # type: ignore
    from matgl.ext.ase import PESCalculator  # type: ignore
    pot = matgl.load_model("M3GNet-MP-2021.2.8-PES")
    return PESCalculator(pot)


def _emt_factory():
    """Effective Medium Theory — built into ASE, no install needed."""
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
        except (ImportError, Exception):  # noqa: BLE001
            continue
        out.append(mlip_id)
    return out


def make_calculator(mlip_id: str):
    """Construct an ASE Calculator for the given MLIP id."""
    if mlip_id not in CALCULATORS:
        raise ValueError(f"unknown MLIP '{mlip_id}'; choices: {sorted(CALCULATORS)}")
    _label, factory = CALCULATORS[mlip_id]
    return factory()
