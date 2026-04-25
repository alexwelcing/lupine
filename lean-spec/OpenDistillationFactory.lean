import OpenDistillationFactory.Materials.Elasticity.FCC
import OpenDistillationFactory.Materials.Distillation.Operator
import OpenDistillationFactory.Materials.Distillation.Extracted
import OpenDistillationFactory.Materials.Mechanics.HallPetch
import OpenDistillationFactory.Materials.Scope.Validity

-- Data layer: provenance, benchmark entries, embedded datasets
import OpenDistillationFactory.Materials.Data.Provenance
import OpenDistillationFactory.Materials.Data.Benchmark
import OpenDistillationFactory.Materials.Data.EmpiricalParadox

-- Analysis layer: statistics, causal inference, and manifold geometry
import OpenDistillationFactory.Materials.Analysis.Stats
import OpenDistillationFactory.Materials.Analysis.Causal
import OpenDistillationFactory.Materials.Analysis.Manifold

-- Computation layer: reproducible simulation traces
import OpenDistillationFactory.Materials.Computation.LammpsTrace

-- Theory layer: first-principles conjectures and bounds
import OpenDistillationFactory.Materials.Theory.ParameterBound
import OpenDistillationFactory.Materials.Theory.MetaScience
import OpenDistillationFactory.Materials.Theory.HyperRibbon
import OpenDistillationFactory.Materials.Theory.HyperRibbonEmpirical

-- Validation layer: experiment design, integrity checks, and audit
import OpenDistillationFactory.Materials.Validation.Experiment
import OpenDistillationFactory.Materials.Validation.Audit

-- Executable vision: the build-locking epistemic contract
import OpenDistillationFactory.Materials.Vision
