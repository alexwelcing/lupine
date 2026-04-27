"""glim-mlip — thin client for the glim-mlip-bench HF ZeroGPU Space.

Standalone module — works without `tools/glim.py` (which lands in PR #13).
Once both branches merge, wire into `glim.py` by adding:

    from glim_mlip import mlip
    cli.add_command(mlip)

Usage:
    python glim_mlip.py predict --element Al --mlip chgnet
    python glim_mlip.py batch --elements Al,Cu,Ni --mlips chgnet \\
        --references-from references.json --out records.jsonl
    python glim_mlip.py ingest records.jsonl
    python glim_mlip.py space-info

Reads HF Space URL from GLIM_HF_SPACE env (default:
https://huggingface.co/spaces/AlexWelcing/glim-mlip-bench). Reads worker URL
from GLIM_API_URL (default: https://glim-think-v1.aw-ab5.workers.dev).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Optional

import click
import httpx

DEFAULT_SPACE = "https://huggingface.co/spaces/AlexWelcing/glim-mlip-bench"
DEFAULT_API = "https://glim-think-v1.aw-ab5.workers.dev"


def _space_base(space_url: str) -> str:
    """Resolve a HF Space URL to its direct *.hf.space subdomain."""
    base = space_url.rstrip("/")
    if "huggingface.co/spaces/" in base:
        parts = base.split("huggingface.co/spaces/")[-1].split("/")
        if len(parts) >= 2:
            user, name = parts[0], parts[1]
            base = f"https://{user}-{name}.hf.space"
    return base


def _call_gradio(space_url: str, api_name: str, data: list[Any], timeout: float = 300.0) -> Any:
    """Call a Gradio 6.x endpoint via POST + SSE streaming."""
    base = _space_base(space_url)
    call_url = f"{base}/gradio_api/call/{api_name}"
    try:
        r = httpx.post(call_url, json={"data": data}, timeout=60.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"Space unreachable at {call_url}: {e}") from e
    if r.status_code >= 400:
        raise click.ClickException(f"{call_url} → {r.status_code}: {r.text[:300]}")
    event_id = r.json()["event_id"]

    # Poll SSE stream
    stream_url = f"{call_url}/{event_id}"
    try:
        r = httpx.get(stream_url, timeout=timeout)
    except httpx.RequestError as e:
        raise click.ClickException(f"SSE stream unreachable at {stream_url}: {e}") from e
    if r.status_code >= 400:
        raise click.ClickException(f"{stream_url} → {r.status_code}: {r.text[:300]}")

    # Parse SSE: last non-empty line after "event: complete" contains the data
    result = None
    for line in r.text.splitlines():
        if line.startswith("data: "):
            result = json.loads(line[6:])
    if result is None:
        raise click.ClickException("no data in SSE stream")
    # Gradio 6.x wraps single-output results in [[...]] for batch-like consistency
    if isinstance(result, list) and len(result) == 1:
        return result[0]
    return result


@click.group()
@click.option("--space", envvar="GLIM_HF_SPACE", default=DEFAULT_SPACE,
              help="HF Space URL (override via GLIM_HF_SPACE env)")
@click.option("--api-url", envvar="GLIM_API_URL", default=DEFAULT_API,
              help="glim-think worker URL (for `ingest`)")
@click.pass_context
def mlip(ctx: click.Context, space: str, api_url: str) -> None:
    """MLIP elastic-constant predictions via the glim-mlip-bench HF Space."""
    ctx.ensure_object(dict)
    ctx.obj["space"] = space
    ctx.obj["api_url"] = api_url


@mlip.command()
@click.option("--element", required=True, help="Element symbol (Al, Cu, ...)")
@click.option("--mlip", "mlip_id", default="chgnet", show_default=True)
@click.pass_context
def predict(ctx: click.Context, element: str, mlip_id: str) -> None:
    """Single (element, mlip) → ElasticResult."""
    out = _call_gradio(ctx.obj["space"], "predict", [element, mlip_id])
    click.echo(json.dumps(out, indent=2))


@mlip.command()
@click.option("--elements", required=True, help="Comma-separated element symbols")
@click.option("--mlips", default="chgnet", show_default=True,
              help="Comma-separated MLIP ids")
@click.option("--references-from", "references_path", type=click.Path(exists=True, dir_okay=False, path_type=Path),
              default=None,
              help="references.json (when set, output is BenchmarkRecord schema)")
@click.option("--out", "out_path", type=click.Path(dir_okay=False, path_type=Path),
              default=None, help="Write JSONL to this path (else print to stdout)")
@click.pass_context
def batch(ctx: click.Context, elements: str, mlips: str,
          references_path: Optional[Path], out_path: Optional[Path]) -> None:
    """Batch predict elements × mlips. With --references-from, output is JSONL of
    BenchmarkRecord dicts ready for `ingest`."""
    refs_json = "{}"
    if references_path is not None:
        refs_json = references_path.read_text(encoding="utf-8")
    out = _call_gradio(ctx.obj["space"], "predict_batch",
                       [elements, mlips, refs_json])
    if not isinstance(out, list):
        raise click.ClickException(f"unexpected response shape: {type(out).__name__}")
    if out_path is None:
        for row in out:
            click.echo(json.dumps(row))
    else:
        with out_path.open("w", encoding="utf-8") as f:
            for row in out:
                f.write(json.dumps(row) + "\n")
        click.echo(f"wrote {len(out)} records -> {out_path}")


@mlip.command()
@click.argument("jsonl_path", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.pass_context
def ingest(ctx: click.Context, jsonl_path: Path) -> None:
    """POST a JSONL of BenchmarkRecords to the worker's /ingest/batch."""
    records = [json.loads(line) for line in jsonl_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not records:
        raise click.ClickException("no records in JSONL")
    api = ctx.obj["api_url"].rstrip("/")
    try:
        r = httpx.post(f"{api}/ingest/batch",
                       json={"records": records}, timeout=120.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"worker unreachable at {api}: {e}") from e
    if r.status_code >= 400:
        raise click.ClickException(f"ingest failed: {r.status_code}: {r.text[:300]}")
    click.echo(f"ingested {len(records)} records: {r.text}")


@mlip.command("space-info")
@click.pass_context
def space_info(ctx: click.Context) -> None:
    """Print the resolved Space URL and quickly probe its config endpoint."""
    space = ctx.obj["space"]
    base = _space_base(space)
    click.echo(f"Space URL:        {space}")
    click.echo(f"predict endpoint: {base}/gradio_api/call/predict")
    click.echo(f"batch endpoint:   {base}/gradio_api/call/predict_batch")
    try:
        r = httpx.get(f"{base}/config", timeout=10.0)
        click.echo(f"GET /config -> {r.status_code}")
        if r.status_code == 200:
            cfg = r.json()
            click.echo(f"  title:   {cfg.get('title', '?')}")
    except httpx.RequestError as e:
        click.echo(f"  ({e})")


if __name__ == "__main__":
    mlip(obj={})
