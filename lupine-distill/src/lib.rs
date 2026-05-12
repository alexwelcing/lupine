//! Library surface for `lupine-distill` — intentionally narrow.
//!
//! The CLI in `main.rs` is the primary entry point. This `lib.rs` exists
//! solely to expose the **public schema-contract types** so they can be
//! asserted against from integration tests (e.g.
//! `tests/vectorize_schema.rs`) and, eventually, from sister Rust binaries
//! that need to construct `worker_sync` payloads.
//!
//! Anything added here is observably public and breaking-change-sensitive.
//! Keep the surface minimal.

pub mod worker_sync;
