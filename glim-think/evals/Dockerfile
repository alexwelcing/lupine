# Cloud Run Job image for the glim-think Phoenix eval pass.
# Replaces the hourly GitHub Actions cron with a Scheduler-triggered job
# (no 6h CI limits, reliable cadence, heavier eval budget).
FROM node:24-slim

WORKDIR /app

# tsx is a runtime dependency here (not a devDependency), so a plain
# install brings the executor. No lockfile in this package — use install.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
# Normalize CRLF → LF (repo is edited on Windows); a \r in the entry
# script turns `run-evals.ts` into `run-evals.ts\r` → exit 127.
RUN sed -i 's/\r$//' cloud-run-entry.sh && chmod +x cloud-run-entry.sh

# Cloud Run Jobs treat exit 0 as success. The entrypoint mirrors the GH
# workflow's continue-on-error posture for informational steps.
ENTRYPOINT ["./cloud-run-entry.sh"]
