# Multi-stage build for tasks-consumer (Cloud Tasks → atlas-distill dispatcher).
# Stage 1: build the Rust binary.
FROM rust:1.88-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest first for layer caching.
COPY gcp/tasks-consumer/Cargo.toml ./Cargo.toml

# Prime the dep cache with a stub main.
RUN mkdir -p src && echo "fn main() {}" > src/main.rs \
    && cargo build --release --bin tasks-consumer || true \
    && rm -rf src

# Copy real source and build.
COPY gcp/tasks-consumer/src ./src
RUN touch src/main.rs && cargo build --release --bin tasks-consumer

# Stage 2: minimal runtime.
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 consumer

COPY --from=builder /app/target/release/tasks-consumer /usr/local/bin/tasks-consumer

USER consumer

# Cloud Run injects PORT.
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

ENTRYPOINT ["tasks-consumer"]
