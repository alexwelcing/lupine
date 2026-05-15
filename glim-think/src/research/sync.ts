/**
 * GCP Sync — nightly bridge from CF edge state to Google Cloud home base.
 *
 * Three sync paths:
 *   1. D1 → BigQuery: new records, claims, literature_insights
 *   2. R2 → GCS: diary snapshots, critique artifacts
 *   3. Corpus metrics → KV snapshot (for lab broadcast)
 *
 * Auth: Uses a GCP service account key stored as Wrangler secret
 * `GCP_SA_KEY` (JSON string). Generates short-lived access tokens
 * via the OAuth2 JWT assertion flow.
 *
 * All sync operations are idempotent — safe to re-run on failure.
 */
import type { Env } from "../types";

const GCP_PROJECT = "shed-489901";
const GCS_BUCKET = "lupine-corpus";
const BQ_DATASET = "lupine_research";
const GCS_API = "https://storage.googleapis.com/upload/storage/v1";
const BQ_API = "https://bigquery.googleapis.com/bigquery/v2";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface SyncResult {
  ok: boolean;
  records_synced: number;
  claims_synced: number;
  insights_synced: number;
  artifacts_mirrored: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Generate a GCP access token from a service account key using
 * the JWT assertion flow. Token is valid for 1 hour.
 */
async function getAccessToken(saKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: saKey.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(payload)}`;

  // Import the PEM private key for signing
  const pemBody = saKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signingInput}.${sig64}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`GCP token fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Upload a JSON object to GCS.
 */
async function uploadToGCS(
  token: string,
  path: string,
  data: unknown,
): Promise<void> {
  const res = await fetch(
    `${GCS_API}/b/${GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GCS upload ${path}: ${res.status} ${body.slice(0, 200)}`);
  }
}

/**
 * Insert rows into BigQuery using the streaming insertAll API.
 */
async function insertIntoBQ(
  token: string,
  table: string,
  rows: Record<string, unknown>[],
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };

  const body = {
    rows: rows.map((r, i) => ({
      insertId: `${table}-${Date.now()}-${i}`,
      json: r,
    })),
  };

  const res = await fetch(
    `${BQ_API}/projects/${GCP_PROJECT}/datasets/${BQ_DATASET}/tables/${table}/insertAll`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { inserted: 0, errors: [`BQ insert ${table}: ${res.status} ${text.slice(0, 200)}`] };
  }

  const data = (await res.json()) as { insertErrors?: unknown[] };
  const insertErrors = data.insertErrors
    ? [`${data.insertErrors.length} row-level errors in ${table}`]
    : [];
  return { inserted: rows.length - (data.insertErrors?.length ?? 0), errors: insertErrors };
}

/**
 * Get the last sync timestamp from KV. Returns ISO string or null.
 */
async function getLastSync(env: Env): Promise<string | null> {
  try {
    return await env.CONFIG.get("sync:last_completed");
  } catch {
    return null;
  }
}

/**
 * Main sync entry point. Called by the nightly cron handler.
 *
 * Steps:
 *   1. Get GCP access token from SA key
 *   2. Query D1 for records added since last sync
 *   3. Stream to BigQuery
 *   4. Mirror diary artifacts to GCS
 *   5. Record sync timestamp in KV
 */
export async function runNightlySync(env: Env): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    ok: false,
    records_synced: 0,
    claims_synced: 0,
    insights_synced: 0,
    artifacts_mirrored: 0,
    errors: [],
    duration_ms: 0,
  };

  // Check for GCP_SA_KEY
  const saKeyRaw = env.GCP_SA_KEY;
  if (!saKeyRaw) {
    result.errors.push("GCP_SA_KEY secret not configured — skipping sync");
    result.duration_ms = Date.now() - start;
    return result;
  }

  let saKey: ServiceAccountKey;
  try {
    saKey = JSON.parse(saKeyRaw) as ServiceAccountKey;
  } catch {
    result.errors.push("GCP_SA_KEY is not valid JSON");
    result.duration_ms = Date.now() - start;
    return result;
  }

  let token: string;
  try {
    token = await getAccessToken(saKey);
  } catch (e) {
    result.errors.push(`Auth failed: ${e instanceof Error ? e.message : String(e)}`);
    result.duration_ms = Date.now() - start;
    return result;
  }

  const lastSync = (await getLastSync(env)) ?? "2020-01-01T00:00:00Z";

  // --- Sync records to BigQuery ---
  try {
    const rows = await env.LEDGER
      .prepare(`SELECT * FROM records WHERE timestamp > ?1 ORDER BY timestamp ASC LIMIT 500`)
      .bind(lastSync)
      .all<Record<string, unknown>>();
    if (rows.results && rows.results.length > 0) {
      const bqResult = await insertIntoBQ(token, "benchmark_records", rows.results);
      result.records_synced = bqResult.inserted;
      result.errors.push(...bqResult.errors);
    }
  } catch (e) {
    result.errors.push(`Records sync: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Sync claims to BigQuery ---
  try {
    const rows = await env.LEDGER
      .prepare(`SELECT * FROM claims WHERE created_at > ?1 ORDER BY created_at ASC LIMIT 500`)
      .bind(lastSync)
      .all<Record<string, unknown>>();
    if (rows.results && rows.results.length > 0) {
      const bqResult = await insertIntoBQ(token, "claims", rows.results);
      result.claims_synced = bqResult.inserted;
      result.errors.push(...bqResult.errors);
    }
  } catch (e) {
    result.errors.push(`Claims sync: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Sync literature insights to BigQuery ---
  try {
    const rows = await env.LEDGER
      .prepare(`SELECT * FROM literature_insights WHERE extracted_at > ?1 ORDER BY extracted_at ASC LIMIT 500`)
      .bind(lastSync)
      .all<Record<string, unknown>>();
    if (rows.results && rows.results.length > 0) {
      const bqResult = await insertIntoBQ(token, "literature_insights", rows.results);
      result.insights_synced = bqResult.inserted;
      result.errors.push(...bqResult.errors);
    }
  } catch (e) {
    result.errors.push(`Insights sync: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Mirror today's diary to GCS ---
  const today = new Date().toISOString().slice(0, 10);
  try {
    const diaryKey = `diary/snapshots/${today}.md`;
    const diaryObj = await env.ARTIFACTS.get(diaryKey);
    if (diaryObj) {
      const content = await diaryObj.text();
      await uploadToGCS(token, `artifacts/${diaryKey}`, { content, synced_at: new Date().toISOString() });
      result.artifacts_mirrored++;
    }
  } catch (e) {
    result.errors.push(`Diary mirror: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Corpus metrics snapshot to GCS ---
  try {
    const counts = await Promise.all([
      env.LEDGER.prepare("SELECT COUNT(*) AS n FROM records").first<{ n: number }>(),
      env.LEDGER.prepare("SELECT COUNT(*) AS n FROM claims").first<{ n: number }>(),
      env.LEDGER.prepare("SELECT COUNT(*) AS n FROM literature_papers").first<{ n: number }>(),
      env.LEDGER.prepare("SELECT COUNT(*) AS n FROM literature_insights").first<{ n: number }>(),
      env.LEDGER.prepare("SELECT COUNT(*) AS n FROM hypotheses").first<{ n: number }>(),
    ]);
    const metrics = {
      date: today,
      records: counts[0]?.n ?? 0,
      claims: counts[1]?.n ?? 0,
      papers: counts[2]?.n ?? 0,
      insights: counts[3]?.n ?? 0,
      hypotheses: counts[4]?.n ?? 0,
      synced_at: new Date().toISOString(),
    };
    await uploadToGCS(token, `metrics/${today}.json`, metrics);
    // Also stash in KV for fast access
    await env.CONFIG.put("corpus:metrics:latest", JSON.stringify(metrics));
  } catch (e) {
    result.errors.push(`Metrics snapshot: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Record sync completion
  try {
    await env.CONFIG.put("sync:last_completed", new Date().toISOString());
  } catch { /* non-fatal */ }

  result.ok = result.errors.length === 0;
  result.duration_ms = Date.now() - start;
  return result;
}
