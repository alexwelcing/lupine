from __future__ import annotations

import json
import pathlib
import time
from dataclasses import dataclass, field
from typing import Any


def now_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class RuntimeEventLog:
    events: list[dict[str, Any]] = field(default_factory=list)

    def emit(self, kind: str, **payload: Any) -> dict[str, Any]:
        event = {
            "schema": "lupine.distill.runtime_event.v1",
            "kind": kind,
            "ts_ms": now_ms(),
            **payload,
        }
        self.events.append(event)
        return event

    def write_jsonl(self, path: str | pathlib.Path | None) -> str | None:
        if not path:
            return None
        target = pathlib.Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("a", encoding="utf-8") as handle:
            for event in self.events:
                handle.write(json.dumps(event, sort_keys=True) + "\n")
        return str(target)
