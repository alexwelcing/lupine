-- Migration 0008: seed ~100 hypotheses for autonomous research-loop bursts.
--
-- The orchestrator + /admin/dispatch-batch route fans out one Cloud Tasks job
-- per hypothesis. With only 4 hypotheses seeded by 0001, the dispatcher
-- starves quickly. This migration adds a systematic 15-element × 5-family
-- matrix plus cross-cutting hypotheses derived from prior research rounds
-- (see memory/lam_trio_closure_2026_05_04.md, mlip_on_immi_2026_05_04.md,
-- meam_bootstrap_2026_05_05.md, cross_mlip_alignment_2026_05_05.md).
--
-- All inserted with status='proposed' so /admin/dispatch-batch picks them up
-- on its first sweep. INSERT OR IGNORE keeps re-runs idempotent.

-- ============================================================================
-- 15-element × 5-family matrix (75 hypotheses)
-- Families:
--   ribbon_persistence  — element stays on the hyper-ribbon under MLIPs
--   mlip_escape         — element escapes to a unique manifold position
--   classical_outlier   — element is an outlier in classical potentials only
--   lam_consistency     — MACE-MP-0, CHGNet, Orb-v3 agree on this element
--   property_split      — element shows different behavior on different axes
-- ============================================================================

INSERT OR IGNORE INTO hypotheses (id, title, status, confidence, created_at, updated_at) VALUES
  -- Al
  ('h_ribbon_persistence_Al', 'Al hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Al',        'Al manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Al',  'Al is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Al',    'MACE+CHGNet+Orb agree on Al elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Al',     'Al ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Cu
  ('h_ribbon_persistence_Cu', 'Cu hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Cu',        'Cu manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Cu',  'Cu is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Cu',    'MACE+CHGNet+Orb agree on Cu elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Cu',     'Cu ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Ni
  ('h_ribbon_persistence_Ni', 'Ni hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Ni',        'Ni manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Ni',  'Ni is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Ni',    'MACE+CHGNet+Orb agree on Ni elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Ni',     'Ni ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Ag
  ('h_ribbon_persistence_Ag', 'Ag hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Ag',        'Ag manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Ag',  'Ag is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Ag',    'MACE+CHGNet+Orb agree on Ag elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Ag',     'Ag ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Au (note: Au escape already confirmed across all 3 LAMs; these probe orthogonal axes)
  ('h_ribbon_persistence_Au', 'Au hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Au',        'Au manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Au',  'Au is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Au',    'MACE+CHGNet+Orb agree on Au elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Au',     'Au ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Pt
  ('h_ribbon_persistence_Pt', 'Pt hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Pt',        'Pt manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Pt',  'Pt is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Pt',    'MACE+CHGNet+Orb agree on Pt elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Pt',     'Pt ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Pd
  ('h_ribbon_persistence_Pd', 'Pd hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Pd',        'Pd manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Pd',  'Pd is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Pd',    'MACE+CHGNet+Orb agree on Pd elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Pd',     'Pd ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Pb
  ('h_ribbon_persistence_Pb', 'Pb hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Pb',        'Pb manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Pb',  'Pb is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Pb',    'MACE+CHGNet+Orb agree on Pb elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Pb',     'Pb ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Fe (already flagged as persistent outlier; these target the why)
  ('h_ribbon_persistence_Fe', 'Fe hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Fe',        'Fe manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Fe',  'Fe is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Fe',    'MACE+CHGNet+Orb agree on Fe elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Fe',     'Fe ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Cr
  ('h_ribbon_persistence_Cr', 'Cr hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Cr',        'Cr manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Cr',  'Cr is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Cr',    'MACE+CHGNet+Orb agree on Cr elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Cr',     'Cr ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Mo
  ('h_ribbon_persistence_Mo', 'Mo hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Mo',        'Mo manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Mo',  'Mo is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Mo',    'MACE+CHGNet+Orb agree on Mo elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Mo',     'Mo ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- W
  ('h_ribbon_persistence_W',  'W hyper-ribbon persistence across MLIP families',  'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_W',         'W manifold escape under MACE+CHGNet+Orb',          'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_W',   'W is a classical-potential outlier only',          'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_W',     'MACE+CHGNet+Orb agree on W elastic constants',     'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_W',      'W ribbon behavior splits across PR axes',          'proposed', NULL, datetime('now'), datetime('now')),
  -- V
  ('h_ribbon_persistence_V',  'V hyper-ribbon persistence across MLIP families',  'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_V',         'V manifold escape under MACE+CHGNet+Orb',          'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_V',   'V is a classical-potential outlier only',          'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_V',     'MACE+CHGNet+Orb agree on V elastic constants',     'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_V',      'V ribbon behavior splits across PR axes',          'proposed', NULL, datetime('now'), datetime('now')),
  -- Nb
  ('h_ribbon_persistence_Nb', 'Nb hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Nb',        'Nb manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Nb',  'Nb is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Nb',    'MACE+CHGNet+Orb agree on Nb elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Nb',     'Nb ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now')),
  -- Ta
  ('h_ribbon_persistence_Ta', 'Ta hyper-ribbon persistence across MLIP families', 'proposed', NULL, datetime('now'), datetime('now')),
  ('h_mlip_escape_Ta',        'Ta manifold escape under MACE+CHGNet+Orb',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_classical_outlier_Ta',  'Ta is a classical-potential outlier only',         'proposed', NULL, datetime('now'), datetime('now')),
  ('h_lam_consistency_Ta',    'MACE+CHGNet+Orb agree on Ta elastic constants',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_split_Ta',     'Ta ribbon behavior splits across PR axes',         'proposed', NULL, datetime('now'), datetime('now'));

-- ============================================================================
-- Cross-cutting hypotheses (15 hypotheses)
-- ============================================================================

INSERT OR IGNORE INTO hypotheses (id, title, status, confidence, created_at, updated_at) VALUES
  ('h_noble_vs_refractory_split',
   'Noble metals (Cu/Ag/Au/Pt/Pd) and refractories (W/Mo/V/Nb/Ta) form distinct manifold clusters',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_orthogonal_mlip_errors_mace_chgnet',
   'MACE and CHGNet have orthogonal error directions on Ag/Nb/Pd',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_orthogonal_mlip_errors_mace_orb',
   'MACE and Orb-v3 have orthogonal error directions',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_orthogonal_mlip_errors_chgnet_orb',
   'CHGNet and Orb-v3 have orthogonal error directions',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_sample_size_confounder_dband',
   'D-band signal at n>=3 is a sample-size artefact, not physics',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_sample_size_confounder_meam',
   'MEAM PR median anomaly is matched-n-bootstrap explicable',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_meam_intrinsically_2d',
   'MEAM at full n shows intrinsic 2-D ribbon (CI [1.58, 2.39])',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_au_specific_mlip_escape',
   'Au escape from hyper-ribbon is specific to MLIPs, not a general noble-metal effect',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_fe_persistent_outlier',
   'Fe stays a PR>2 outlier across MACE+CHGNet+Orb addition',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pd_coherent_mlip_error_mode',
   'Pd shows a coherent error mode across all three MLIPs',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_top3_lam_diagnostics',
   'Top-3 LAMs (MACE, CHGNet, Orb) diagnostically partition the 15-element fleet',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_bccfcc_causal_shield',
   'BCC/FCC structural difference acts as a causal shield for error correlation',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_equivariance_ribbon',
   'Equivariant MLIPs preserve the hyper-ribbon despite higher per-element accuracy',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_cross_paradigm_invariance',
   'Hyper-ribbon survives the classical-to-MLIP paradigm jump',
   'proposed', NULL, datetime('now'), datetime('now')),
  ('h_property_magnitude_spread_confounds_pearson',
   'Pearson r at n=3 with property-magnitude spread is ill-posed for escape detection',
   'proposed', NULL, datetime('now'), datetime('now'));

-- ============================================================================
-- Element-paired hypotheses (10 hypotheses)
-- Probe coherent error structure between physically similar element pairs.
-- ============================================================================

INSERT OR IGNORE INTO hypotheses (id, title, status, confidence, created_at, updated_at) VALUES
  ('h_pair_Cu_Ag',  'Cu and Ag share MLIP error structure (group 11 d10)',     'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Ag_Au',  'Ag and Au share MLIP error structure (group 11 d10)',     'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Pt_Pd',  'Pt and Pd share MLIP error structure (group 10 d9-d10)',  'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Fe_Ni',  'Fe and Ni share MLIP error structure (3d transition)',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Cr_Mo',  'Cr and Mo share MLIP error structure (group 6)',          'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Mo_W',   'Mo and W share MLIP error structure (group 6 4d/5d)',     'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_V_Nb',   'V and Nb share MLIP error structure (group 5)',           'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Nb_Ta',  'Nb and Ta share MLIP error structure (group 5 4d/5d)',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Al_Pb',  'Al and Pb share MLIP error structure (sp main group)',    'proposed', NULL, datetime('now'), datetime('now')),
  ('h_pair_Au_Pt',  'Au and Pt share MLIP error structure (5d late TM)',       'proposed', NULL, datetime('now'), datetime('now'));

-- Total new hypotheses: 75 (matrix) + 15 (cross-cutting) + 10 (paired) = 100.
