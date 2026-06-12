from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path
from typing import Any

import calculators
import pytest

EXPECTED_M3GNET_MODEL = "M3GNet-PES-MatPES-PBE-2025.2"


def _load_hf_space_calculators() -> Any:
    path = Path(__file__).parent / "hf_space" / "calculators.py"
    spec = importlib.util.spec_from_file_location("hf_space_calculators", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("module", [calculators, _load_hf_space_calculators()])
def test_m3gnet_default_model_is_current_matpes_pbe(module: Any) -> None:
    assert module.DEFAULT_M3GNET_MODEL == EXPECTED_M3GNET_MODEL
    assert "M3GNet-MP-2021.2.8-PES" not in module.CALCULATORS["m3gnet"][0]


@pytest.mark.parametrize("module", [calculators, _load_hf_space_calculators()])
def test_m3gnet_factory_uses_env_model_override(monkeypatch: pytest.MonkeyPatch, module: Any) -> None:
    installs: list[tuple[str, str | None]] = []
    loaded_models: list[str] = []
    override_model = "M3GNet-PES-MatPES-r2SCAN-2025.2"

    monkeypatch.setenv("M3GNET_MODEL_NAME", override_model)
    monkeypatch.setenv("M3GNET_MATGL_PACKAGE", "matgl==4.0.2")
    monkeypatch.setattr(
        module,
        "_ensure_installed",
        lambda package_spec, import_name=None: installs.append((package_spec, import_name)),
    )

    fake_matgl = types.ModuleType("matgl")

    def fake_load_model(model_name: str) -> dict[str, str]:
        loaded_models.append(model_name)
        return {"model": model_name}

    fake_matgl.load_model = fake_load_model  # type: ignore[attr-defined]

    fake_ext = types.ModuleType("matgl.ext")
    fake_ase = types.ModuleType("matgl.ext.ase")

    class FakePESCalculator:
        def __init__(self, potential: dict[str, str]) -> None:
            self.potential = potential

    fake_ase.PESCalculator = FakePESCalculator  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "matgl", fake_matgl)
    monkeypatch.setitem(sys.modules, "matgl.ext", fake_ext)
    monkeypatch.setitem(sys.modules, "matgl.ext.ase", fake_ase)

    calc = module._m3gnet_factory()

    assert installs == [("matgl==4.0.2", "matgl")]
    assert loaded_models == [override_model]
    assert calc.potential == {"model": override_model}


@pytest.mark.parametrize("module", [calculators, _load_hf_space_calculators()])
def test_mace_factory_uses_trusted_checkpoint_load(monkeypatch: pytest.MonkeyPatch, module: Any) -> None:
    installs: list[tuple[str, str | None]] = []
    load_kwargs: list[dict[str, Any]] = []

    monkeypatch.setattr(
        module,
        "_ensure_installed",
        lambda package_spec, import_name=None: installs.append((package_spec, import_name)),
    )

    fake_torch = types.ModuleType("torch")

    def fake_load(*_args: Any, **kwargs: Any) -> object:
        load_kwargs.append(dict(kwargs))
        return object()

    fake_torch.load = fake_load  # type: ignore[attr-defined]

    fake_mace = types.ModuleType("mace")
    fake_calculators = types.ModuleType("mace.calculators")

    def fake_mace_mp(**kwargs: Any) -> dict[str, Any]:
        import torch

        torch.load("medium.model")
        return kwargs

    fake_calculators.mace_mp = fake_mace_mp  # type: ignore[attr-defined]
    fake_mace.calculators = fake_calculators  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "mace", fake_mace)
    monkeypatch.setitem(sys.modules, "mace.calculators", fake_calculators)

    calc = module._mace_mp0_factory()

    assert installs == [("mace-torch==0.3.6", "mace")]
    assert load_kwargs == [{"weights_only": False}]
    assert calc["model"] == "medium"
    assert calc["default_dtype"] == "float32"
