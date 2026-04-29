//! ODF Domain Types
//!
//! Physical system, observable, and benchmark instance types from the
//! Open Distillation Factory. These provide a typed representation of
//! materials science simulation entities with provenance support.

use serde::{Deserialize, Serialize};

/// A physical system under study — defines the material, crystal structure,
/// and thermodynamic conditions for a simulation benchmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PhysicalSystem {
    pub material: String,
    pub crystal_structure: String,
    pub temperature_k: f64,
    pub pressure_gpa: f64,
}

/// A named scalar observable with units — the minimal quantum of
/// measured/computed data in the distillation pipeline.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Observable {
    pub name: String,
    pub value: f64,
    pub unit: String,
}

/// A benchmark instance binding a physical system to its measured observables.
/// This is the input unit for the distillation engine.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BenchmarkInstance {
    pub id: String,
    pub system: PhysicalSystem,
    pub observables: Vec<Observable>,
}

impl BenchmarkInstance {
    /// Create a new benchmark instance from components.
    pub fn new(id: impl Into<String>, system: PhysicalSystem) -> Self {
        Self {
            id: id.into(),
            system,
            observables: Vec::new(),
        }
    }

    /// Add an observable measurement to this instance.
    pub fn with_observable(mut self, name: &str, value: f64, unit: &str) -> Self {
        self.observables.push(Observable {
            name: name.to_string(),
            value,
            unit: unit.to_string(),
        });
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn benchmark_builder_works() {
        let system = PhysicalSystem {
            material: "Al".to_string(),
            crystal_structure: "FCC".to_string(),
            temperature_k: 300.0,
            pressure_gpa: 0.0,
        };

        let bench = BenchmarkInstance::new("al-fcc-300k", system)
            .with_observable("C11", 108.2, "GPa")
            .with_observable("C12", 61.3, "GPa")
            .with_observable("C44", 28.5, "GPa");

        assert_eq!(bench.id, "al-fcc-300k");
        assert_eq!(bench.observables.len(), 3);
        assert_eq!(bench.system.material, "Al");
    }
}
