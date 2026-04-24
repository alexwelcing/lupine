use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunConfig {
    pub hardware_target: String,
    pub gpu_count: u32,
    pub mpi_ranks: u32,
    pub additional_flags: Vec<String>,
}

impl Default for RunConfig {
    fn default() -> Self {
        Self {
            hardware_target: "cpu".to_string(),
            gpu_count: 1,
            mpi_ranks: 1,
            additional_flags: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LupineManifest {
    pub project_id: String,
    pub target_potential: String,
    pub data_file: String,
    pub units: String,
    pub boundary: String,
    pub timesteps: u64,
    pub timestep_size: f64,
    pub dump_frequency: u64,
    pub run_config: RunConfig,
}

impl Default for LupineManifest {
    fn default() -> Self {
        Self {
            project_id: "default_project".to_string(),
            target_potential: "lj".to_string(),
            data_file: "in.data".to_string(),
            units: "metal".to_string(),
            boundary: "p p p".to_string(),
            timesteps: 1000,
            timestep_size: 0.001,
            dump_frequency: 100,
            run_config: RunConfig::default(),
        }
    }
}

impl LupineManifest {
    /// Compiles the strict configuration into an executable LAMMPS input script fragment.
    /// This acts as our safety layer so properties like boundaries and units cannot drift.
    pub fn compile_lammps_script(&self, mlip_block: &str) -> String {
        format!(
            "# Lupine Generated Deployment: {}\n\
            units {}\n\
            boundary {}\n\
            atom_style atomic\n\
            read_data {}\n\
            \n\
            # --- MLIP PAIR_STYLE INJECTION ---\n\
            {}\n\
            # ---------------------------------\n\
            \n\
            thermo 100\n\
            dump 1 all atom {} {}.dump\n\
            timestep {}\n\
            run {}\n",
            self.project_id,
            self.units,
            self.boundary,
            self.data_file,
            mlip_block,
            self.dump_frequency,
            self.project_id,
            self.timestep_size,
            self.timesteps
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_script_compilation() {
        let manifest = LupineManifest::default();
        let script =
            manifest.compile_lammps_script("pair_style kim openkim_id\npair_coeff * * C H");
        assert!(script.contains("units metal"));
        assert!(script.contains("pair_style kim"));
    }
}
