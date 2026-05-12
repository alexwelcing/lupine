-- Migration 0007: lab_beats
-- A "beat" is a single broadcast tick from atlas-distill (the producer in
-- the secure live ticker architecture, docs/handoff/05). Each beat is one
-- agent saying "I am here, I did this, with these metrics". The dashboard
-- pulls beats from this table (eventually via /feed/beats GET) to render
-- the live ticker. The producer authenticates with a GCP OIDC token; this
-- table is just the durable record once the auth check passes.

CREATE TABLE IF NOT EXISTS lab_beats (
  beat_id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  summary TEXT NOT NULL,
  metrics TEXT,
  ts INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_lab_beats_ts ON lab_beats(ts DESC);
