//! Subcommand implementations split out of main.rs.
//!
//! Each command keeps its own module so main.rs stays a thin Clap
//! dispatcher. Commands that need async (e.g. emit_beat for GCP OIDC +
//! HTTPS) spin up a tokio runtime locally rather than forcing the whole
//! binary into async.

pub mod auto_research;
pub mod emit_beat;
