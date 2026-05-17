# Cloud Run Job image for the glim-think Phoenix eval pass.
# Replaces the hourly GitHub Actions cron with a Scheduler-triggered job
# (no 6h CI limits, reliable cadence, heavier eval budget).
FROM node:24-slim

WORKDIR /app

COPY . .
# Correctness by construction (do NOT rely on .dockerignore — `gcloud run
# deploy --source` uses .gcloudignore for the upload, so a Windows-built
# node_modules can ride along and clobber the Linux one → `tsx: Permission
# denied`). Nuke any copied node_modules and clean-install inside the
# image. Also strip CRLF from the entry script (`run-evals.ts\r` → 127).
RUN rm -rf node_modules \
 && npm install --no-audit --no-fund \
 && sed -i 's/\r$//' cloud-run-entry.sh \
 && chmod +x cloud-run-entry.sh

# Cloud Run Jobs treat exit 0 as success. The entrypoint mirrors the GH
# workflow's continue-on-error posture for informational steps.
ENTRYPOINT ["./cloud-run-entry.sh"]
