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
from GLIM_API_URL (default: https://glim-think-v1.aw-ab5.workers.dev). Reads
the gated-worker internal token from GLIM_INGEST_TOKEN, GLIM_INTERNAL_TOKEN, or
INTERNAL_TASK_TOKEN.
"""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

import click
import httpx

DEFAULT_SPACE = "https://huggingface.co/spaces/AlexWelcing/glim-mlip-bench"
DEFAULT_API = "https://glim-think-v1.aw-ab5.workers.dev"


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return [record for record in records if isinstance(record, dict)]


def _auth_headers(token: str) -> dict[str, str]:
    token = token.strip()
    return {"X-Internal-Token": token} if token else {}


def _run_provenance_from_env() -> dict[str, str]:
    env = os.environ
    run_id = env.get("GLIM_BENCHMARK_RUN_ID")
    repository = env.get("GITHUB_REPOSITORY")
    server_url = env.get("GITHUB_SERVER_URL", "https://github.com")
    run_url = env.get("GLIM_BENCHMARK_RUN_URL")
    if not run_url and run_id and repository:
        run_url = f"{server_url.rstrip('/')}/{repository}/actions/runs/{run_id}"
    data = {
        "github_run_id": run_id,
        "github_run_url": run_url,
        "github_repository": repository,
        "github_workflow": env.get("GITHUB_WORKFLOW"),
        "github_sha": env.get("GITHUB_SHA"),
        "github_ref": env.get("GITHUB_REF"),
    }
    return {key: value for key, value in data.items() if value}


def _with_run_provenance(row: Any, extra: dict[str, str]) -> Any:
    if not extra or not isinstance(row, dict):
        return row
    provenance = row.get("provenance")
    if not isinstance(provenance, dict):
        provenance = {}
    return {**row, "provenance": {**provenance, **extra}}


def _space_base(space_url: str) -> str:
    """Resolve a HF Space URL to its direct *.hf.space subdomain."""
    base = space_url.rstrip("/")
    if "huggingface.co/spaces/" in base:
        parts = base.split("huggingface.co/spaces/")[-1].split("/")
        if len(parts) >= 2:
            user, name = parts[0], parts[1]
            base = f"https://{user}-{name}.hf.space"
    return base


def _is_local_server(space_url: str) -> bool:
    """A URL is a local server if it's loopback, OR if it's neither a
    huggingface.co/spaces/... URL nor a direct *.hf.space subdomain."""
    if "localhost" in space_url or "127.0.0.1" in space_url:
        return True
    return "huggingface.co" not in space_url and ".hf.space" not in space_url


def _call_gradio(space_url: str, api_name: str, data: list[Any], timeout: float = 300.0) -> Any:
    """Call a Gradio 6.x endpoint via POST + SSE streaming, or direct FastAPI."""
    base = _space_base(space_url)

    # Local FastAPI server uses direct POST/JSON, not Gradio SSE
    if _is_local_server(space_url):
        url = f"{base}/{api_name}"
        payload = {"element": data[0], "mlip": data[1]} if api_name == "predict" else {"elements": data[0], "mlips": data[1], "references_json": data[2]}
        try:
            r = httpx.post(url, json=payload, timeout=timeout)
        except httpx.RequestError as e:
            raise click.ClickException(f"Server unreachable at {url}: {e}") from e
        if r.status_code >= 400:
            raise click.ClickException(f"{url} -> {r.status_code}: {r.text[:300]}")
        return r.json()

    # HF Space: Gradio 6.x SSE streaming
    call_url = f"{base}/gradio_api/call/{api_name}"
    try:
        r = httpx.post(call_url, json={"data": data}, timeout=60.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"Space unreachable at {call_url}: {e}") from e
    if r.status_code == 404:
        return _call_gradio_queue(base, api_name, data, timeout)
    if r.status_code >= 400:
        raise click.ClickException(f"{call_url} -> {r.status_code}: {r.text[:300]}")
    event_id = r.json()["event_id"]

    stream_url = f"{call_url}/{event_id}"
    try:
        r = httpx.get(stream_url, timeout=timeout)
    except httpx.RequestError as e:
        raise click.ClickException(f"SSE stream unreachable at {stream_url}: {e}") from e
    if r.status_code >= 400:
        raise click.ClickException(f"{stream_url} -> {r.status_code}: {r.text[:300]}")

    result = None
    for line in r.text.splitlines():
        if line.startswith("data: "):
            result = json.loads(line[6:])
    if result is None:
        raise click.ClickException("no data in SSE stream")
    if isinstance(result, list) and len(result) == 1:
        return result[0]
    return result


def _call_gradio_queue(base: str, api_name: str, data: list[Any], timeout: float = 300.0) -> Any:
    """Call a Gradio 4.x queued endpoint using /queue/join + SSE data."""
    try:
        cfg = httpx.get(f"{base}/config", timeout=30.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"Space config unreachable at {base}/config: {e}") from e
    if cfg.status_code >= 400:
        raise click.ClickException(f"{base}/config -> {cfg.status_code}: {cfg.text[:300]}")
    deps = cfg.json().get("dependencies", [])
    match = next((dep for dep in deps if dep.get("api_name") == api_name), None)
    if not isinstance(match, dict):
        raise click.ClickException(f"Space config does not expose api_name={api_name!r}")
    fn_index = match.get("id")
    if not isinstance(fn_index, int):
        raise click.ClickException(f"Space config has invalid fn_index for api_name={api_name!r}")

    session_hash = f"codex_{uuid.uuid4().hex}"
    payload: dict[str, Any] = {
        "data": data,
        "fn_index": fn_index,
        "session_hash": session_hash,
    }
    targets = match.get("targets")
    if isinstance(targets, list) and targets and isinstance(targets[0], list) and targets[0]:
        payload["trigger_id"] = targets[0][0]

    join_url = f"{base}/queue/join"
    try:
        joined = httpx.post(join_url, json=payload, timeout=60.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"Space queue unreachable at {join_url}: {e}") from e
    if joined.status_code >= 400:
        raise click.ClickException(f"{join_url} -> {joined.status_code}: {joined.text[:300]}")

    stream_url = f"{base}/queue/data?session_hash={session_hash}"
    result = None
    try:
        with httpx.stream("GET", stream_url, timeout=timeout) as stream:
            if stream.status_code >= 400:
                raise click.ClickException(f"{stream_url} -> {stream.status_code}: {stream.text[:300]}")
            for line in stream.iter_lines():
                if not line.startswith("data: "):
                    continue
                event = json.loads(line[6:])
                if event.get("msg") != "process_completed":
                    continue
                if event.get("success") is False:
                    raise click.ClickException(f"Space queue job failed: {json.dumps(event)[:300]}")
                output = event.get("output")
                if not isinstance(output, dict):
                    raise click.ClickException("Space queue completion missing output")
                result = output.get("data")
                break
    except httpx.RequestError as e:
        raise click.ClickException(f"SSE stream unreachable at {stream_url}: {e}") from e
    if result is None:
        raise click.ClickException("no completed event in Gradio queue stream")
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
          references_path: Path | None, out_path: Path | None) -> None:
    """Batch predict elements × mlips. With --references-from, output is JSONL of
    BenchmarkRecord dicts ready for `ingest`."""
    refs_json = "{}"
    if references_path is not None:
        refs_json = references_path.read_text(encoding="utf-8")
    out = _call_gradio(ctx.obj["space"], "predict_batch",
                       [elements, mlips, refs_json])
    if not isinstance(out, list):
        raise click.ClickException(f"unexpected response shape: {type(out).__name__}")
    out = [_with_run_provenance(row, _run_provenance_from_env()) for row in out]
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
@click.option(
    "--internal-token",
    envvar=["GLIM_INGEST_TOKEN", "GLIM_INTERNAL_TOKEN", "INTERNAL_TASK_TOKEN"],
    default="",
    help="Token for the worker X-Internal-Token gate.",
)
@click.pass_context
def ingest(ctx: click.Context, jsonl_path: Path, internal_token: str) -> None:
    """POST a JSONL of BenchmarkRecords to the worker's /ingest/batch."""
    records = [_with_run_provenance(row, _run_provenance_from_env()) for row in _load_jsonl(jsonl_path)]
    if not records:
        raise click.ClickException("no records in JSONL")
    api = ctx.obj["api_url"].rstrip("/")
    headers = _auth_headers(internal_token)
    try:
        r = httpx.post(f"{api}/ingest/batch",
                       json={"records": records}, headers=headers,
                       timeout=120.0)
    except httpx.RequestError as e:
        raise click.ClickException(f"worker unreachable at {api}: {e}") from e
    if r.status_code >= 400:
        hint = ""
        if r.status_code == 403 and not internal_token.strip():
            hint = " (set GLIM_INGEST_TOKEN or INTERNAL_TASK_TOKEN for gated workers)"
        raise click.ClickException(f"ingest failed: {r.status_code}: {r.text[:300]}{hint}")
    click.echo(f"ingested {len(records)} records: {r.text}")


@mlip.command("discovery-loop")
@click.argument("jsonl_path", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--campaign-id", envvar="GLIM_DISCOVERY_CAMPAIGN_ID", default="")
@click.option("--github-run-id", envvar=["GLIM_BENCHMARK_RUN_ID", "GITHUB_RUN_ID"], default="")
@click.option("--run-url", envvar="GLIM_BENCHMARK_RUN_URL", default="")
@click.option("--artifact-name", default="")
@click.option("--maintain/--no-maintain", default=True, show_default=True)
@click.option(
    "--internal-token",
    envvar=["GLIM_INGEST_TOKEN", "GLIM_INTERNAL_TOKEN", "INTERNAL_TASK_TOKEN"],
    default="",
    help="Token for the worker X-Internal-Token gate.",
)
@click.pass_context
def discovery_loop(
    ctx: click.Context,
    jsonl_path: Path,
    campaign_id: str,
    github_run_id: str,
    run_url: str,
    artifact_name: str,
    maintain: bool,
    internal_token: str,
) -> None:
    """Open and maintain a glim-think MLIP discovery-loop campaign."""
    records = _load_jsonl(jsonl_path)
    if not records:
        raise click.ClickException("no records in JSONL")
    api = ctx.obj["api_url"].rstrip("/")
    headers = _auth_headers(internal_token)
    payload = {
        "campaign_id": campaign_id or None,
        "github_run_id": github_run_id or None,
        "run_url": run_url or None,
        "artifact_name": artifact_name or None,
        "records": records,
    }
    try:
        r = httpx.post(
            f"{api}/research/workflows/mlip-discovery-loop/campaigns",
            json=payload,
            headers=headers,
            timeout=120.0,
        )
    except httpx.RequestError as e:
        raise click.ClickException(f"worker unreachable at {api}: {e}") from e
    if r.status_code >= 400:
        raise click.ClickException(f"discovery loop failed: {r.status_code}: {r.text[:300]}")
    body = r.json()
    created_campaign = body.get("campaign_id") if isinstance(body, dict) else None
    click.echo(f"opened discovery loop {created_campaign}: {r.text}")
    if not maintain:
        return
    if not isinstance(created_campaign, str) or not created_campaign:
        raise click.ClickException("discovery loop response did not include campaign_id")
    try:
        m = httpx.post(
            f"{api}/research/workflows/mlip-discovery-loop/campaigns/{created_campaign}/maintain",
            json={"mode": "agenda", "limit": 8},
            headers=headers,
            timeout=120.0,
        )
    except httpx.RequestError as e:
        raise click.ClickException(f"worker unreachable at {api}: {e}") from e
    if m.status_code >= 400:
        raise click.ClickException(f"discovery maintain failed: {m.status_code}: {m.text[:300]}")
    click.echo(f"maintained discovery loop {created_campaign}: {m.text}")


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
