"""Integration tests for the benchmark and uplift CLI entry points.

These exercise the exact code paths the CI YAML invokes, without torch_sim.
"""

from __future__ import annotations

import json
import pathlib

import pytest

from lupine_distill import benchmark as benchmark_cli
from lupine_distill import uplift_cli
from lupine_distill.schemas import BenchmarkResult


@pytest.mark.integration
def test_benchmark_cli_writes_valid_result(tmp_path: pathlib.Path) -> None:
    out = tmp_path / "result.json"
    rc = benchmark_cli.main(
        ["--model", "mace-mp-0", "--distill-v", "0", "--backend", "torchsim", "--suite", "smoke", "--output", str(out)]
    )
    assert rc == 0
    payload = json.loads(out.read_text(encoding="utf-8"))
    # Round-trips through the canonical schema.
    result = BenchmarkResult.model_validate(payload)
    assert result.model_id == "mace-mp-0"
    assert result.distill_version == 0
    assert set(result.results) == {"static_energy", "geometry_opt"}


@pytest.mark.integration
def test_benchmark_cli_stdout(capsys: pytest.CaptureFixture[str]) -> None:
    rc = benchmark_cli.main(["--model", "m", "--distill-v", "1", "--suite", "smoke"])
    assert rc == 0
    out = capsys.readouterr().out
    result = BenchmarkResult.model_validate_json(out)
    assert result.distill_version == 1


@pytest.mark.integration
def test_benchmark_cli_negative_version_returns_2() -> None:
    rc = benchmark_cli.main(["--model", "m", "--distill-v", "-1"])
    assert rc == 2


@pytest.mark.integration
def test_uplift_cli_synthesizes_and_promotes(tmp_path: pathlib.Path) -> None:
    out = tmp_path / "uplift.json"
    rc = uplift_cli.main(
        ["--model", "m", "--distill-v", "3", "--suite", "smoke", "--output", str(out)]
    )
    assert rc == 0
    report = json.loads(out.read_text(encoding="utf-8"))
    # Synthetic mock improves 10%/version, so v3 clears the +5% promote gate.
    assert report["promotion_recommendation"] == "promote"
    assert report["overall_uplift_pct"] > 5.0
    assert report["distill_version"] == 3
    assert report["baseline_version"] == 0


@pytest.mark.integration
def test_uplift_cli_reads_result_files(tmp_path: pathlib.Path) -> None:
    # Produce a v0 and a v2 via the benchmark CLI, then feed both to uplift.
    v0 = tmp_path / "v0.json"
    v2 = tmp_path / "v2.json"
    benchmark_cli.main(["--model", "m", "--distill-v", "0", "--suite", "smoke", "--output", str(v0)])
    benchmark_cli.main(["--model", "m", "--distill-v", "2", "--suite", "smoke", "--output", str(v2)])

    out = tmp_path / "report.json"
    rc = uplift_cli.main(
        ["--model", "m", "--distill-v", "2", "--baseline", str(v0), "--distilled", str(v2), "--output", str(out)]
    )
    assert rc == 0
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["benchmarks_compared"] == 2
    assert report["overall_uplift_pct"] > 0.0
    assert report["promotion_recommendation"] in {"promote", "review", "reject"}


@pytest.mark.integration
def test_uplift_cli_bad_baseline_path_exits() -> None:
    with pytest.raises(SystemExit):
        uplift_cli.main(["--model", "m", "--distill-v", "1", "--baseline", "C:/no/such/file.json"])
