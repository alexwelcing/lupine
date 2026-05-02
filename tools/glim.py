"""glim — local dispatch CLI for the glim-think Cloudflare Worker.

Wraps the worker's HTTP routes (analysis, hypotheses, critiques, research
questions, literature, fleet) so research work can be dispatched from a
terminal without hand-crafted curl. Reads the worker URL from
GLIM_API_URL (default: the deployed production URL).

Usage:
    glim ask "Why does Cu LJ overestimate C44?"
    glim critique queue swarm_preprint_review/critique11.md
    glim critique pending
    glim hypothesis list
    glim run --element Al --analysis manifold,causal
    glim fleet run --elements Al,Cu,Ni
    glim watch --interval 30
    glim dispatch-critique11

Run `glim --help` for the full subcommand list.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional, Sequence

import click
import httpx

DEFAULT_URL = "https://glim-think-v1.aw-ab5.workers.dev"
DEFAULT_TIMEOUT = 30.0

CRITIQUE11_GAPS: Sequence[dict[str, str]] = (
    {
        "id": "c11_hyperribbon_classifier",
        "source": "critique11",
        "question": (
            "Strengthen hyper-ribbon discriminative tests against null Gaussian "
            "benchmarks at small n (3-12). The classifier passes 44-96% of "
            "isotropic null datasets at small n; quantify FPR vs n and propose "
            "stronger test (e.g., geometric-spacing + bootstrap CI on PR/d)."
        ),
        "target_hypothesis_id": "h1_hyperribbon",
    },
    {
        "id": "c11_mlip_evidence",
        "source": "critique11",
        "question": (
            "Provide direct MLIP error-manifold evidence on elastic constants "
            "(C11/C12/C44) for CHGNet, MACE-MP-0, M3GNet across the 15-element "
            "corpus. Hypothesis h4_mlip_invariance is currently 'pending' with "
            "no MLIP rows in the D1 ledger."
        ),
        "target_hypothesis_id": "h4_mlip_invariance",
    },
    {
        "id": "c11_pearl_identification",
        "source": "critique11",
        "question": (
            "Provide a formal Pearl identification proof (back-door / front-door "
            "criterion) showing that stratification by element + pair_style "
            "blocks confounding for benchmark-error correlation in materials "
            "science. Render the DAG explicitly."
        ),
        "target_hypothesis_id": "h2_bccfcc",
    },
    {
        "id": "c11_simpson_signreversal",
        "source": "critique11",
        "question": (
            "Find true sign-reversal Simpson's-paradox examples in physical "
            "sciences (not just magnitude attenuation). Cite at least 3 from "
            "domains adjacent to materials (e.g., epidemiology, ML benchmarks, "
            "psychometrics) that are pedagogically clean."
        ),
        "target_hypothesis_id": "h3_ecological",
    },
)


# ---------- HTTP client ----------

@dataclass(frozen=True)
class GlimClient:
    base_url: str
    timeout: float = DEFAULT_TIMEOUT

    def _request(self, method: str, path: str, **kw: Any) -> httpx.Response:
        url = f"{self.base_url.rstrip('/')}{path}"
        try:
            with httpx.Client(timeout=self.timeout) as c:
                return c.request(method, url, **kw)
        except httpx.RequestError as e:
            raise click.ClickException(f"Worker unreachable at {url}: {e}") from e

    def get(self, path: str, **kw: Any) -> httpx.Response:
        return self._request("GET", path, **kw)

    def post(self, path: str, **kw: Any) -> httpx.Response:
        return self._request("POST", path, **kw)

    def patch(self, path: str, **kw: Any) -> httpx.Response:
        return self._request("PATCH", path, **kw)


def _decode(resp: httpx.Response) -> Any:
    if resp.status_code >= 400:
        raise click.ClickException(
            f"{resp.request.method} {resp.request.url} → {resp.status_code}: {resp.text[:300]}"
        )
    if not resp.text:
        return None
    try:
        return resp.json()
    except json.JSONDecodeError:
        return resp.text


def _client(api_url: Optional[str]) -> GlimClient:
    base = api_url or os.environ.get("GLIM_API_URL") or DEFAULT_URL
    return GlimClient(base_url=base)


# ---------- Helpers ----------

def _table(rows: Iterable[Sequence[Any]], headers: Sequence[str]) -> str:
    rows_list = [tuple(str(c) if c is not None else "" for c in r) for r in rows]
    widths = [len(h) for h in headers]
    for row in rows_list:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    sep = "  "
    lines = [sep.join(h.ljust(widths[i]) for i, h in enumerate(headers))]
    lines.append(sep.join("-" * w for w in widths))
    for row in rows_list:
        lines.append(sep.join(cell.ljust(widths[i]) for i, cell in enumerate(row)))
    return "\n".join(lines)


def _excerpt(text: str, max_len: int = 80) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= max_len else text[: max_len - 1] + "…"


def _find_critique11(start: Optional[Path] = None) -> Optional[Path]:
    """Walk up from start (or cwd) looking for swarm_preprint_review/critique11.md."""
    cur = (start or Path.cwd()).resolve()
    for _ in range(8):
        candidate = cur / "swarm_preprint_review" / "critique11.md"
        if candidate.is_file():
            return candidate
        if cur.parent == cur:
            return None
        cur = cur.parent
    return None


def _extract_question(md_text: str) -> str:
    """Pull the first heading or first paragraph as the question."""
    for line in md_text.splitlines():
        s = line.strip()
        if s.startswith("#"):
            return s.lstrip("#").strip()
    for para in md_text.split("\n\n"):
        p = para.strip()
        if p:
            return _excerpt(p, 240)
    return md_text.strip()[:240]


# ---------- CLI scaffolding ----------

@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--api-url", envvar="GLIM_API_URL", default=None, help="Worker URL override.")
@click.pass_context
def cli(ctx: click.Context, api_url: Optional[str]) -> None:
    """glim — dispatch research work to the glim-think worker."""
    ctx.ensure_object(dict)
    ctx.obj["client"] = _client(api_url)


# ---------- ask: research-question queue ----------

@cli.command()
@click.argument("question")
@click.option("--asked-by", default=None, help="Identifier for the asker (your handle).")
@click.option("--target-hypothesis", default=None, help="Hypothesis id this question targets.")
@click.pass_context
def ask(ctx: click.Context, question: str, asked_by: Optional[str], target_hypothesis: Optional[str]) -> None:
    """Queue a free-text research question (lab-notebook style)."""
    client: GlimClient = ctx.obj["client"]
    payload = {"question": question}
    if asked_by:
        payload["asked_by"] = asked_by
    if target_hypothesis:
        payload["target_hypothesis_id"] = target_hypothesis
    body = _decode(client.post("/research/questions", json=payload))
    click.echo(json.dumps(body, indent=2))


# ---------- critique ----------

@cli.group()
def critique() -> None:
    """Manage peer-review critiques in the worker queue."""


@critique.command("queue")
@click.argument("file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--source", default=None, help="Source label (default: filename stem).")
@click.option("--target-hypothesis", default=None)
@click.option("--id", "critique_id", default=None, help="Override the auto-generated id.")
@click.pass_context
def critique_queue(
    ctx: click.Context,
    file: Path,
    source: Optional[str],
    target_hypothesis: Optional[str],
    critique_id: Optional[str],
) -> None:
    """Queue a critique by reading the question from a markdown file."""
    text = file.read_text(encoding="utf-8")
    payload: dict[str, Any] = {
        "source": source or file.stem,
        "question": _extract_question(text),
    }
    if target_hypothesis:
        payload["target_hypothesis_id"] = target_hypothesis
    if critique_id:
        payload["id"] = critique_id
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.post("/critiques", json=payload))
    click.echo(json.dumps(body, indent=2))


@critique.command("pending")
@click.option("--limit", default=50, type=int)
@click.pass_context
def critique_pending(ctx: click.Context, limit: int) -> None:
    """List pending critiques as a table."""
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.get(f"/critiques/pending?limit={limit}"))
    rows = body if isinstance(body, list) else body.get("critiques", body) if isinstance(body, dict) else []
    if not rows:
        click.echo("(no pending critiques)")
        return
    headers = ["id", "source", "question", "status", "target"]
    table_rows = [
        (
            r.get("id", ""),
            r.get("source", ""),
            _excerpt(r.get("question", "")),
            r.get("status", ""),
            r.get("target_hypothesis_id", ""),
        )
        for r in rows
    ]
    click.echo(_table(table_rows, headers))


@critique.command("respond")
@click.argument("critique_id")
@click.argument("response_file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--agent-id", default=None)
@click.pass_context
def critique_respond(ctx: click.Context, critique_id: str, response_file: Path, agent_id: Optional[str]) -> None:
    """Submit a markdown response file for a queued critique."""
    payload = {"response_md": response_file.read_text(encoding="utf-8")}
    if agent_id:
        payload["agent_id"] = agent_id
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.post(f"/critiques/{critique_id}/respond", json=payload))
    click.echo(json.dumps(body, indent=2))


# ---------- hypothesis ----------

@cli.group()
def hypothesis() -> None:
    """Manage hypothesis records."""


@hypothesis.command("list")
@click.pass_context
def hypothesis_list(ctx: click.Context) -> None:
    """Print all hypotheses as a table."""
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.get("/hypotheses"))
    rows = body if isinstance(body, list) else body.get("hypotheses", body) if isinstance(body, dict) else []
    if not rows:
        click.echo("(no hypotheses)")
        return
    headers = ["id", "title", "status", "confidence"]
    table_rows = [
        (
            r.get("id", ""),
            _excerpt(r.get("title", ""), 60),
            r.get("status", ""),
            r.get("confidence", ""),
        )
        for r in rows
    ]
    click.echo(_table(table_rows, headers))


@hypothesis.command("update")
@click.argument("hypothesis_id")
@click.option("--status", "new_status", default=None)
@click.option("--confidence", default=None, type=float)
@click.option("--evidence-ids", default=None, help="JSON array string.")
@click.pass_context
def hypothesis_update(
    ctx: click.Context,
    hypothesis_id: str,
    new_status: Optional[str],
    confidence: Optional[float],
    evidence_ids: Optional[str],
) -> None:
    """Patch a hypothesis row."""
    payload: dict[str, Any] = {}
    if new_status is not None:
        payload["status"] = new_status
    if confidence is not None:
        payload["confidence"] = confidence
    if evidence_ids is not None:
        payload["evidence_ids"] = evidence_ids
    if not payload:
        raise click.UsageError("Provide at least one of --status / --confidence / --evidence-ids")
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.patch(f"/hypotheses/{hypothesis_id}", json=payload))
    click.echo(json.dumps(body, indent=2))


# ---------- run / fleet ----------

@cli.command()
@click.option("--element", default=None)
@click.option("--analysis", default="manifold,causal", help="Comma-separated analysis types.")
@click.option("--exclude-styles", default=None, help="Comma-separated pair_style values to exclude.")
@click.option("--only-styles", default=None, help="Comma-separated pair_style values to include.")
@click.pass_context
def run(
    ctx: click.Context,
    element: Optional[str],
    analysis: str,
    exclude_styles: Optional[str],
    only_styles: Optional[str],
) -> None:
    """Trigger /run — synchronous manifold + causal analysis."""
    payload: dict[str, Any] = {"analysis_types": [s.strip() for s in analysis.split(",") if s.strip()]}
    if element:
        payload["element"] = element
    if exclude_styles:
        payload["exclude_styles"] = [s.strip() for s in exclude_styles.split(",") if s.strip()]
    if only_styles:
        payload["only_styles"] = [s.strip() for s in only_styles.split(",") if s.strip()]
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.post("/run", json=payload))
    click.echo(json.dumps(body, indent=2))


@cli.group()
def fleet() -> None:
    """Multi-element parallel orchestration."""


@fleet.command("run")
@click.option("--elements", default=None, help="Comma-separated element list (default: worker default 15).")
@click.pass_context
def fleet_run(ctx: click.Context, elements: Optional[str]) -> None:
    """POST /fleet/run."""
    payload: dict[str, Any] = {}
    if elements:
        payload["elements"] = [s.strip() for s in elements.split(",") if s.strip()]
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.post("/fleet/run", json=payload))
    click.echo(json.dumps(body, indent=2))


@fleet.command("status")
@click.pass_context
def fleet_status(ctx: click.Context) -> None:
    """GET /fleet/status."""
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.get("/fleet/status"))
    click.echo(json.dumps(body, indent=2))


# ---------- literature ----------

@cli.group()
def literature() -> None:
    """Search and browse the literature cache."""


@literature.command("search")
@click.argument("query")
@click.option("--sources", default="arxiv,semantic_scholar,openalex")
@click.option("--max", "max_results", default=5, type=int)
@click.pass_context
def literature_search(ctx: click.Context, query: str, sources: str, max_results: int) -> None:
    """Search literature across configured sources."""
    payload = {
        "query": query,
        "sources": [s.strip() for s in sources.split(",") if s.strip()],
        "max": max_results,
    }
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.post("/literature/search", json=payload))
    click.echo(json.dumps(body, indent=2))


# ---------- watch ----------

@cli.command()
@click.option("--interval", default=30, type=int, help="Polling interval in seconds.")
@click.option("--once", is_flag=True, help="Single iteration (useful for testing).")
@click.pass_context
def watch(ctx: click.Context, interval: int, once: bool) -> None:
    """Long-poll /experiments/pending; print new entries as they appear."""
    client: GlimClient = ctx.obj["client"]
    seen: set[str] = set()
    while True:
        try:
            body = _decode(client.get("/experiments/pending"))
            experiments = body.get("experiments", []) if isinstance(body, dict) else []
            new = [e for e in experiments if e.get("experiment_id") not in seen]
            for e in new:
                eid = e.get("experiment_id", "")
                seen.add(eid)
                click.echo(f"[{time.strftime('%H:%M:%S')}] {eid} {e.get('element','?')}/{e.get('potential_label','?')}")
        except click.ClickException as e:
            click.echo(f"watch: {e.message}", err=True)
        if once:
            return
        time.sleep(interval)


# ---------- openapi ----------

@cli.command()
@click.pass_context
def openapi(ctx: click.Context) -> None:
    """Fetch and pretty-print /openapi.json."""
    client: GlimClient = ctx.obj["client"]
    body = _decode(client.get("/openapi.json"))
    click.echo(json.dumps(body, indent=2))


# ---------- dispatch-critique11 ----------

@cli.command("dispatch-critique11")
@click.option("--file", "critique_file", type=click.Path(exists=True, dir_okay=False, path_type=Path), default=None,
              help="Override path to critique11.md (auto-detected by walking up from cwd).")
@click.option("--dry-run", is_flag=True, help="Print payloads without POSTing.")
@click.pass_context
def dispatch_critique11(ctx: click.Context, critique_file: Optional[Path], dry_run: bool) -> None:
    """Drain the 4 critique11.md gaps into the worker's critique queue.

    Idempotent: if a critique with the same id already exists, the worker is
    expected to no-op (or report duplicate); either way we print the result.
    """
    found = critique_file or _find_critique11()
    if found is None:
        click.echo("warning: critique11.md not found by walking up from cwd; "
                   "using the bundled question list", err=True)
    else:
        click.echo(f"using critique source: {found}")

    client: GlimClient = ctx.obj["client"]
    posted = 0
    for gap in CRITIQUE11_GAPS:
        if dry_run:
            click.echo(json.dumps(gap, indent=2))
            continue
        try:
            body = _decode(client.post("/critiques", json=dict(gap)))
            click.echo(f"queued: {gap['id']}: {json.dumps(body)[:200]}")
            posted += 1
        except click.ClickException as e:
            click.echo(f"skip: {gap['id']}: {e.message}", err=True)

    if not dry_run:
        click.echo(f"\ndispatched {posted}/{len(CRITIQUE11_GAPS)} critiques")


def main() -> None:
    cli(obj={})


if __name__ == "__main__":
    main()
