# Metals Collection

## Datasets

### Copper (Cu) - FCC
- **WEST-MC-001**: Dislocation-GB interaction database (6.6GB)
  - 100s of symmetric tilt GBs
  - Multiple dislocation character types
  - Viewer manifest: `../../viewer-manifests/WEST-MC-001.json`
  
### Nickel (Ni) - FCC  
- **WEST-ZEN-004**: Edge dislocation mobility (Bayesian analysis)
  - Mishin 2004 EAM potential
  - DEMC parameter fitting
  - Trajectory data available

### Titanium (Ti) - hcp
- **WEST-ZEN-001**: GRIP GB phases (431MB)
  - Automated grand-canonical optimization
  - 0001, 01-10, 12-10 tilt boundaries
  - Phase transition data

### Iron-Copper (Fe-Cu) Alloys
- **CN-NBSDC-002**: Hydrogen embrittlement (~2GB)
  - Grain boundary segregation
  - H diffusion pathways
  - DFT + MD combined validation

## Linked Manifests
```
WEST-MC-001.json -> ../../viewer-manifests/WEST-MC-001.json
WEST-ZEN-001.json -> ../../viewer-manifests/WEST-ZEN-001.json
WEST-ZEN-004.json -> ../../viewer-manifests/WEST-ZEN-004.json
CN-NBSDC-002.json -> ../../viewer-manifests/CN-NBSDC-002.json
```

## Common Properties
- **Crystal structures**: FCC, hcp, BCC (alloys)
- **Primary defects**: Dislocations, grain boundaries, stacking faults
- **Simulation methods**: EAM potentials, NPT ensemble
- **Typical sizes**: 10K - 1M atoms
