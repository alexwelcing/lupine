//! Domain module — ODF types and provenance digesting.
//!
//! This module integrates the Open Distillation Factory domain layer
//! into atlas-distill, providing typed physical system representations
//! and content-addressed provenance for distillation artifacts.

pub mod odf_types;
pub mod provenance;
pub mod schemas;

pub use odf_types::{BenchmarkInstance, Observable, PhysicalSystem};
pub use provenance::fnv1a64_hex;
pub use schemas::{OperatorPack, OperatorStatus, RiskEntry, RiskLevel, RunManifest, RunStatus};
