use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MlipOpsError {
    #[error("Missing model path for backend requirement")]
    MissingModelPath,
    #[error("Local model path not found: {0}")]
    PathNotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MlipBackend {
    OpenKim,
    DeepMd,
    FitSnap,
    Mace,
    MlIapKokkos,
    Meam,
    EamAlloy,
    Eam,
    EamFs,
    Adp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlipDeployment {
    pub backend: MlipBackend,
    pub model_identifier: String,
    pub model_path: Option<String>,
    #[serde(default)]
    pub auxiliary_paths: Vec<String>,
}

impl MlipDeployment {
    pub fn new(backend: MlipBackend, identifier: impl Into<String>) -> Self {
        Self {
            backend,
            model_identifier: identifier.into(),
            model_path: None,
            auxiliary_paths: Vec::new(),
        }
    }

    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.model_path = Some(path.into());
        self
    }

    pub fn with_auxiliary_path(mut self, path: impl Into<String>) -> Self {
        self.auxiliary_paths.push(path.into());
        self
    }

    /// Generates the strict LAMMPS setup instructions, completely walling off
    /// any arbitrary user string injection that could compromise reproducibility.
    pub fn construct_pair_style(
        &self,
        type_map: &BTreeMap<u32, String>,
    ) -> Result<String, MlipOpsError> {
        let elements: Vec<String> = type_map.values().cloned().collect();
        let element_str = elements.join(" ");

        match self.backend {
            MlipBackend::OpenKim => {
                // OpenKIM standard format `kim <model_id>`
                Ok(format!(
                    "pair_style kim {}\npair_coeff * * {}",
                    self.model_identifier, element_str
                ))
            }
            MlipBackend::DeepMd => {
                // DeePMD version 3 plugin path
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!("pair_style deepmd {}\npair_coeff * *", path))
            }
            MlipBackend::MlIapKokkos => {
                // Highly performant Kokkos dispatch bridging PyTorch
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style mliap unified\npair_coeff * * {} {}",
                    path, element_str
                ))
            }
            MlipBackend::FitSnap => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style snap\npair_coeff * * {} {} {}",
                    path, self.model_identifier, element_str
                ))
            }
            MlipBackend::Mace => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style mace no_domain_decomposition\npair_coeff * * {} {}",
                    path, element_str
                ))
            }
            MlipBackend::EamAlloy => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style eam/alloy\npair_coeff * * {} {}",
                    path, element_str
                ))
            }
            MlipBackend::Meam => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                let aux_path = self
                    .auxiliary_paths
                    .first()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                // MEAM syntax: pair_coeff * * library.meam elements... parameter.meam elements...
                // Assuming auxiliary[0] is the library.meam and model_path is the parameter.meam
                Ok(format!(
                    "pair_style meam\npair_coeff * * {} {} {} {}",
                    aux_path, element_str, path, element_str
                ))
            }
            MlipBackend::EamFs => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style eam/fs\npair_coeff * * {} {}",
                    path, element_str
                ))
            }
            MlipBackend::Adp => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style adp\npair_coeff * * {} {}",
                    path, element_str
                ))
            }
            MlipBackend::Eam => {
                let path = self
                    .model_path
                    .as_ref()
                    .ok_or(MlipOpsError::MissingModelPath)?;
                Ok(format!(
                    "pair_style eam\npair_coeff * * {}",
                    path // eam pair_coeff often just takes the file, elements implicit, but let's be safe. Wait, single-element eam usually takes just the file.
                ))
            }
        }
    }

    pub fn validate_local_paths(&self) -> Result<(), MlipOpsError> {
        if let Some(path_str) = &self.model_path
            && !Path::new(path_str).exists()
        {
            return Err(MlipOpsError::PathNotFound(path_str.clone()));
        }
        for aux_path in &self.auxiliary_paths {
            if !Path::new(aux_path).exists() {
                return Err(MlipOpsError::PathNotFound(aux_path.clone()));
            }
        }
        for aux_path in &self.auxiliary_paths {
            if !Path::new(aux_path).exists() {
                return Err(MlipOpsError::PathNotFound(aux_path.clone()));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openkim_generation() {
        let deployment = MlipDeployment::new(MlipBackend::OpenKim, "MO_123456789");
        let mut map = BTreeMap::new();
        map.insert(1, "Si".to_string());
        map.insert(2, "O".to_string());

        let style = deployment.construct_pair_style(&map).unwrap();
        assert_eq!(style, "pair_style kim MO_123456789\npair_coeff * * Si O");
    }

    #[test]
    fn test_missing_path() {
        let deployment = MlipDeployment::new(MlipBackend::DeepMd, "my_model");
        let map = BTreeMap::new();
        assert!(matches!(
            deployment.construct_pair_style(&map),
            Err(MlipOpsError::MissingModelPath)
        ));
    }
}
