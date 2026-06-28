# Multi-stage build for atlas-distill
# atlas-distill depends on ../lupine-ops, so both crates are copied into a
# matching directory layout and built from /app/atlas-distill.
FROM rust:1.88-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy lupine-ops dependency first (it changes less often).
WORKDIR /app/lupine-ops
COPY lupine-ops/Cargo.toml lupine-ops/Cargo.lock ./
COPY lupine-ops/src ./src

# Copy atlas-distill manifest + lockfile for cargo layer caching.
WORKDIR /app/atlas-distill
COPY atlas-distill/Cargo.toml atlas-distill/Cargo.lock ./

# Copy atlas-distill source
COPY atlas-distill/src ./src

# Build release binary (workspace root is atlas-distill/Cargo.toml)
RUN cargo build --release --bin atlas-distill

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies (SSL certs for ureq + reqwest)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 atlas

# Copy binary from builder
COPY --from=builder /app/atlas-distill/target/release/atlas-distill /usr/local/bin/atlas-distill

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
