CREATE TABLE IF NOT EXISTS mlip_baseline_runs (
  run_id TEXT PRIMARY KEY,
  workflow_instance_id TEXT,
  hypothesis_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  profile TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  manifest_url TEXT NOT NULL,
  artifact_prefix TEXT NOT NULL,
  max_dollars_per_hour REAL NOT NULL,
  requested_max_active_gpu_cells INTEGER NOT NULL,
  max_active_gpu_cells INTEGER NOT NULL,
  max_poll_waves INTEGER NOT NULL,
  rows_json TEXT NOT NULL,
  mlips_json TEXT NOT NULL,
  cost_estimate_json TEXT NOT NULL,
  report_r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS mlip_baseline_cells (
  cell_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  row_id TEXT NOT NULL,
  mlip_id TEXT NOT NULL,
  status TEXT NOT NULL,
  target_job TEXT,
  manifest_url TEXT,
  task_name TEXT,
  operation_name TEXT,
  accuracy_score REAL,
  accuracy_unit TEXT,
  speed_score REAL,
  speed_unit TEXT,
  metrics_json TEXT,
  artifact_uri TEXT,
  trace_id TEXT,
  span_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  enqueued_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mlip_baseline_cells_run_status
  ON mlip_baseline_cells(run_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_mlip_baseline_cells_grid
  ON mlip_baseline_cells(run_id, row_id, mlip_id);
