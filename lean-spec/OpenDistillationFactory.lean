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
import OpenDistillationFactory.Materials.Theory.RibbonProjection
import OpenDistillationFactory.Materials.Theory.ContextSpecificProof
import OpenDistillationFactory.Materials.Theory.AccuracyCommitment
import OpenDistillationFactory.Materials.Theory.UniversalityBridge
import OpenDistillationFactory.Materials.Theory.ProjectedRibbon
import OpenDistillationFactory.Materials.Theory.ErrorGeometry
import OpenDistillationFactory.Materials.Theory.ProjectionLaw
import OpenDistillationFactory.Materials.Theory.SpectrumBridge
import OpenDistillationFactory.Materials.Theory.ConvexProjection
import OpenDistillationFactory.Materials.Theory.WeakAcceleration

-- Validation layer: experiment design, integrity checks, and audit
import OpenDistillationFactory.Materials.Validation.Experiment
import OpenDistillationFactory.Materials.Validation.Audit

-- Executable vision: the build-locking epistemic contract
import OpenDistillationFactory.Materials.Vision
