"""Universal-MLIP calculator factory with lazy imports + runtime install.

Each MLIP family (CHGNet, MACE-MP, M3GNet) is wrapped so the import only
happens when the calculator is requested. If the package is missing, we
attempt a runtime `pip install` so the Space can stay lightweight at build
time and pull in heavy deps (~2 GB torch + models) on first use.
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from typing import Callable

DEFAULT_M3GNET_MODEL = "M3GNet-PES-MatPES-PBE-2025.2"
DEFAULT_MATGL_PACKAGE = "matgl==4.0.2"


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


def _patch_torch_load() -> None:
    """PyTorch 2.6+ defaults torch.load to weights_only=True.

    MACE-MP currently loads an official legacy checkpoint that needs the older
    trusted-checkpoint behavior.
    """
    import torch
    if getattr(torch.load, "_glim_weights_only_patch", False):
        return
    _orig = torch.load

    def _load(*args, **kwargs):
        kwargs.setdefault("weights_only", False)
        return _orig(*args, **kwargs)

    _load._glim_weights_only_patch = True
    torch.load = _load


def _mace_mp0_factory():
    _ensure_installed("mace-torch==0.3.6", "mace")
    _patch_torch_load()
    from mace.calculators import mace_mp  # type: ignore
    return mace_mp(model="medium", default_dtype="float32")


def _m3gnet_factory():
    _ensure_installed(os.environ.get("M3GNET_MATGL_PACKAGE", DEFAULT_MATGL_PACKAGE), "matgl")
    import matgl  # type: ignore
    from matgl.ext.ase import PESCalculator  # type: ignore
    model_name = os.environ.get("M3GNET_MODEL_NAME", DEFAULT_M3GNET_MODEL)
    pot = matgl.load_model(model_name)
    return PESCalculator(pot)


def _emt_factory():
    """Effective Medium Theory — built into ASE, no install needed."""
    from ase.calculators.emt import EMT
    return EMT()


CALCULATORS: dict[str, tuple[str, Callable]] = {
    "chgnet": ("CHGNet (Deng 2023)", _chgnet_factory),
    "mace_mp0": ("MACE-MP-0 (Batatia 2024)", _mace_mp0_factory),
    "m3gnet": ("M3GNet MatPES PBE 2025.2", _m3gnet_factory),
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
