from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

import elastic
import pytest


def _load_hf_space_elastic() -> Any:
    path = Path(__file__).parent / "hf_space" / "elastic.py"
    spec = importlib.util.spec_from_file_location("hf_space_elastic", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["hf_space_elastic"] = module
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("module", [elastic, _load_hf_space_elastic()])
def test_stress_to_gpa_factor_defaults_to_ase_native_conversion(module: Any) -> None:
    assert module._stress_to_gpa_factor(object()) == module.EV_PER_A3_TO_GPA


@pytest.mark.parametrize("module", [elastic, _load_hf_space_elastic()])
def test_stress_to_gpa_factor_honors_gpa_calculator_hint(module: Any) -> None:
    class Calculator:
        _glim_stress_unit = "GPa"

    assert module._stress_to_gpa_factor(Calculator()) == 1.0
