# Multi-stage build for atlas-distill
# Stage 1: Build the Rust binary
FROM rust:1.88-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching. The Docker workspace is
# intentionally smaller than the repo workspace to keep Cloud Build context lean.
COPY atlas-distill/Cargo.docker.toml ./Cargo.toml
COPY Cargo.lock ./
COPY atlas-distill/Cargo.toml ./atlas-distill/Cargo.toml
COPY lupine-ops/Cargo.toml ./lupine-ops/Cargo.toml

# Copy workspace source code
COPY atlas-distill/src ./atlas-distill/src
COPY lupine-ops/src ./lupine-ops/src

# Build release binary
RUN cargo build --release -p atlas-distill --bin atlas-distill

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies (SSL certs for ureq)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 atlas

# Copy binary from builder
COPY --from=builder /app/target/release/atlas-distill /usr/local/bin/atlas-distill

# Copy benchmark data
COPY atlas-distill/benchmarks ./benchmarks

# Set ownership
RUN chown -R atlas:atlas /app
USER atlas

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD atlas-distill --version || exit 1

# Default entrypoint
ENTRYPOINT ["atlas-distill"]
CMD ["--help"]
