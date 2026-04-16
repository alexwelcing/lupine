# Polymers Collection

## Datasets

### Epoxy/Polyurethane Copolymers
- **CN-LICP-001**: Friction at varying temperatures (~100MB)
  - 2EP/PU and 2PU/EP ratios
  - Temperatures: 223K, 298K, 373K
  - Iron layer sliding interface
  - ReaxFF potential

### Crosslinked Epoxy Resin
- **WEST-ZEN-003**: Curing and mechanics (59.2MB)
  - Curing reaction templates (bond/react)
  - Glass transition annealing
  - Tensile test simulations
  - Amber + DREIDING force fields

## Common Properties
- **Force fields**: ReaxFF, Amber, DREIDING, OPLS
- **Ensembles**: NPT for equilibration, NVT for deformation
- **Timescales**: Nanoseconds (requires acceleration methods)
- **Key observables**: Chain conformation, crosslink density, Tg

## Viewer Notes
- Chain visualization requires bond rendering
- Large aspect ratio boxes common
- Temperature-dependent coloring useful
- Hide hydrogen for clarity at scale
