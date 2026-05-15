#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# provision-gcp.sh — One-time GCP infrastructure for the research flywheel
#
# Prerequisites:
#   - gcloud CLI authenticated as project owner
#   - Project: shed-489901
#
# Run from the repo root:
#   bash scripts/provision-gcp.sh
# ──────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT="shed-489901"
REGION="us-central1"
SA_RESEARCH="glim-research"
SA_COMPUTE="glim-compute"
BUCKET="lupine-corpus"
BQ_DATASET="lupine_research"

echo "╔══════════════════════════════════════════════════╗"
echo "║  GLIM Research Flywheel — GCP Provisioning       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Project: ${PROJECT}"
echo "Region:  ${REGION}"
echo ""

# ─── 1. Service Accounts ───────────────────────────────────

echo "▸ Creating service account: ${SA_RESEARCH}"
gcloud iam service-accounts create "${SA_RESEARCH}" \
  --project="${PROJECT}" \
  --display-name="GLIM Research Agent" \
  --description="Autonomous research agent — Storage, BigQuery, Firestore access" \
  2>/dev/null || echo "  (already exists)"

echo "▸ Creating service account: ${SA_COMPUTE}"
gcloud iam service-accounts create "${SA_COMPUTE}" \
  --project="${PROJECT}" \
  --display-name="GLIM Compute Worker" \
  --description="GPU workload execution — Compute Engine + Storage" \
  2>/dev/null || echo "  (already exists)"

# ─── 2. IAM Bindings (least privilege) ─────────────────────

SA_RESEARCH_EMAIL="${SA_RESEARCH}@${PROJECT}.iam.gserviceaccount.com"
SA_COMPUTE_EMAIL="${SA_COMPUTE}@${PROJECT}.iam.gserviceaccount.com"

echo ""
echo "▸ Granting IAM roles to ${SA_RESEARCH_EMAIL}"

for ROLE in \
  "roles/storage.objectAdmin" \
  "roles/bigquery.dataEditor" \
  "roles/bigquery.jobUser" \
  "roles/datastore.user"; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_RESEARCH_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet 2>/dev/null
  echo "  ✓ ${ROLE}"
done

echo ""
echo "▸ Granting IAM roles to ${SA_COMPUTE_EMAIL}"

for ROLE in \
  "roles/compute.instanceAdmin.v1" \
  "roles/storage.objectViewer"; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_COMPUTE_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet 2>/dev/null
  echo "  ✓ ${ROLE}"
done

# ─── 3. GCS Bucket ─────────────────────────────────────────

echo ""
echo "▸ Creating GCS bucket: gs://${BUCKET}"
gcloud storage buckets create "gs://${BUCKET}" \
  --project="${PROJECT}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  2>/dev/null || echo "  (already exists)"

# Lifecycle: move to Nearline after 90 days
echo "▸ Setting lifecycle rules"
cat > /tmp/gcs-lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
      "condition": { "age": 90 }
    }
  ]
}
EOF
gcloud storage buckets update "gs://${BUCKET}" \
  --lifecycle-file=/tmp/gcs-lifecycle.json \
  --quiet 2>/dev/null
echo "  ✓ Nearline after 90 days"

# ─── 4. BigQuery Dataset + Tables ──────────────────────────

echo ""
echo "▸ Creating BigQuery dataset: ${BQ_DATASET}"
bq mk --dataset \
  --project_id="${PROJECT}" \
  --location="${REGION}" \
  --description="GLIM research analytics" \
  "${PROJECT}:${BQ_DATASET}" \
  2>/dev/null || echo "  (already exists)"

echo "▸ Creating BigQuery tables"

# benchmark_records
bq mk --table "${PROJECT}:${BQ_DATASET}.benchmark_records" \
  record_id:STRING,element:STRING,potential_id:STRING,potential_label:STRING,pair_style:STRING,property:STRING,reference:FLOAT,predicted:FLOAT,unit:STRING,provenance:STRING,agent_id:STRING,timestamp:TIMESTAMP \
  2>/dev/null || echo "  benchmark_records (already exists)"
echo "  ✓ benchmark_records"

# claims
bq mk --table "${PROJECT}:${BQ_DATASET}.claims" \
  claim_id:STRING,agent_id:STRING,claim_type:STRING,claim_data:STRING,evidence_ids:STRING,confidence:FLOAT,status:STRING,description:STRING,created_at:TIMESTAMP \
  2>/dev/null || echo "  claims (already exists)"
echo "  ✓ claims"

# literature_insights
bq mk --table "${PROJECT}:${BQ_DATASET}.literature_insights" \
  insight_id:STRING,paper_doi:STRING,hypothesis_id:STRING,key_finding:STRING,relevance_score:FLOAT,agrees_or_refutes:STRING,extracted_at:TIMESTAMP,model:STRING \
  2>/dev/null || echo "  literature_insights (already exists)"
echo "  ✓ literature_insights"

# corpus_metrics (daily snapshots)
bq mk --table "${PROJECT}:${BQ_DATASET}.corpus_metrics" \
  date:DATE,records:INTEGER,claims:INTEGER,papers:INTEGER,insights:INTEGER,hypotheses:INTEGER,synced_at:TIMESTAMP \
  2>/dev/null || echo "  corpus_metrics (already exists)"
echo "  ✓ corpus_metrics"

# experiment_runs
bq mk --table "${PROJECT}:${BQ_DATASET}.experiment_runs" \
  experiment_id:STRING,hypothesis_id:STRING,element:STRING,potential_id:STRING,status:STRING,started_at:TIMESTAMP,completed_at:TIMESTAMP,result_summary:STRING,agent_id:STRING \
  2>/dev/null || echo "  experiment_runs (already exists)"
echo "  ✓ experiment_runs"

# ─── 5. Generate SA Key ───────────────────────────────────

echo ""
KEY_FILE="/tmp/glim-research-sa-key.json"
echo "▸ Generating service account key → ${KEY_FILE}"
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_RESEARCH_EMAIL}" \
  --project="${PROJECT}"
echo "  ✓ Key written to ${KEY_FILE}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  NEXT STEPS                                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  1. Store the SA key as a Wrangler secret:       ║"
echo "║     cat ${KEY_FILE} | wrangler secret put GCP_SA_KEY"
echo "║                                                  ║"
echo "║  2. Create the Vectorize index:                  ║"
echo "║     wrangler vectorize create glim-corpus \\      ║"
echo "║       --dimensions=768 --metric=cosine           ║"
echo "║                                                  ║"
echo "║  3. Deploy glim-think:                           ║"
echo "║     cd glim-think && wrangler deploy             ║"
echo "║                                                  ║"
echo "║  4. Backfill embeddings:                         ║"
echo "║     curl -X POST https://glim-think-v1.../admin/backfill-embeddings"
echo "║                                                  ║"
echo "║  5. Delete the key file:                         ║"
echo "║     rm ${KEY_FILE}                               ║"
echo "╚══════════════════════════════════════════════════╝"
