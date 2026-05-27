from __future__ import annotations

import sys
import types

import mlip_cell_runner as runner


def test_load_uma_uses_fairchem_calculator_contract(monkeypatch) -> None:
    calls = {}

    class PretrainedMlip:
        @staticmethod
        def get_predict_unit(model_name, device):
            calls["model_name"] = model_name
            calls["device"] = device
            return {"predictor": model_name}

    def fake_calculator(predictor, task_name):
        calls["predictor"] = predictor
        calls["task_name"] = task_name
        return {"calculator": predictor, "task_name": task_name}

    fairchem = types.ModuleType("fairchem")
    core = types.ModuleType("fairchem.core")
    core.pretrained_mlip = PretrainedMlip
    core.FAIRChemCalculator = fake_calculator
    fairchem.core = core
    monkeypatch.setitem(sys.modules, "fairchem", fairchem)
    monkeypatch.setitem(sys.modules, "fairchem.core", core)
    monkeypatch.setattr(runner, "device", lambda: "cuda")
    monkeypatch.setenv("UMA_TASK_NAME", "omat")

    calc = runner.load_calculator("uma-s-1p2")

    assert calc == {"calculator": {"predictor": "uma-s-1p2"}, "task_name": "omat"}
    assert calls == {
        "model_name": "uma-s-1p2",
        "device": "cuda",
        "predictor": {"predictor": "uma-s-1p2"},
        "task_name": "omat",
    }
