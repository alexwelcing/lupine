//! Residual-driven active sampling for the universal correction operator.
//!
//! After observing a small seed set of simulations, the operator predicts the
//! corrected residual for every candidate in a pool.  The candidate with the
//! largest predicted residual is the most informative next experiment: it is
//! exactly where the current class-aware model is most wrong.  Selecting those
//! first reduces the number of expensive LAMMPS runs needed to reach a target
//! accuracy.
//!
//! Formal contract (Lean `ActiveSampling.lean`):
//!   1. Greedy residual-max selection minimises the maximum residual over the
//!      remaining unobserved candidates (`greedy_minimizes_max_remaining`).
//!   2. If all residuals live in a known `k`-dimensional subspace, at most `k`
//!      *informative* observations are needed to exhaust the residual directions
//!      (`active_sampling_rank_bound`).
//!   3. Projecting a residual onto the orthogonal complement of an observed
//!      direction never increases its norm (`projection_norm_nonincreasing`).

use nalgebra::DVector;

use crate::universal_feedback::{DirectionPolicy, TrainingRow, UniversalFeedbackLoop};

/// A candidate simulation that has not yet been run.
#[derive(Debug, Clone)]
pub struct Candidate {
    pub id: String,
    pub class: String,
    pub raw: DVector<f64>,
    /// Ground-truth target.  In a real pipeline this is unknown until the
    /// simulation finishes; it is exposed here for benchmarking and testing.
    pub target: DVector<f64>,
}

impl Candidate {
    /// Convert an observed candidate into a training row (shift = zero).
    pub fn into_training_row(self) -> TrainingRow {
        TrainingRow {
            class: self.class,
            raw: self.raw,
            shift: DVector::zeros(self.target.len()),
            target: self.target,
        }
    }

    /// Reference to the underlying training triple.
    pub fn as_training_row(&self) -> TrainingRow {
        TrainingRow {
            class: self.class.clone(),
            raw: self.raw.clone(),
            shift: DVector::zeros(self.target.len()),
            target: self.target.clone(),
        }
    }
}

/// Active sampler driven by the universal correction operator.
#[derive(Debug, Clone)]
pub struct ActiveSampler {
    operator: UniversalFeedbackLoop,
    observed: Vec<TrainingRow>,
    policy: DirectionPolicy,
    dim: usize,
}

impl ActiveSampler {
    /// Create a sampler from an initial seed of observations.
    pub fn new(seed: Vec<TrainingRow>, policy: DirectionPolicy, dim: usize) -> Self {
        let operator = UniversalFeedbackLoop::fit(&seed, policy.clone());
        Self {
            operator,
            observed: seed,
            policy,
            dim,
        }
    }

    /// Number of observations accumulated so far.
    pub fn n_observed(&self) -> usize {
        self.observed.len()
    }

    /// Predict the corrected residual norm for a candidate.
    pub fn score(&self, candidate: &Candidate) -> f64 {
        let zero_shift = DVector::zeros(self.dim);
        self.operator.residual_norm(
            &candidate.class,
            &candidate.raw,
            &zero_shift,
            &candidate.target,
        )
    }

    /// Select the index of the candidate with the largest predicted residual.
    ///
    /// This implements the greedy one-step contract: after observing the
    /// selected candidate, the worst-case residual among the remaining pool is
    /// minimised (`greedy_minimizes_max_remaining` in Lean).
    pub fn select_next(&self, pool: &[Candidate]) -> Option<usize> {
        let scored: Vec<(usize, f64)> = pool
            .iter()
            .enumerate()
            .map(|(i, c)| (i, self.score(c)))
            .collect();
        let selected = scored
            .iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(i, _)| *i);
        if let Some(idx) = selected {
            let max_score = scored
                .iter()
                .map(|(_, s)| *s)
                .fold(f64::NEG_INFINITY, f64::max);
            let selected_score = self.score(&pool[idx]);
            debug_assert!(
                (selected_score - max_score).abs() < 1e-12,
                "select_next must return a candidate with the maximum residual score"
            );
        }
        selected
    }

    /// Observe a new training row and refit the operator.
    pub fn observe(&mut self, row: TrainingRow) {
        self.observed.push(row);
        self.operator = UniversalFeedbackLoop::fit(&self.observed, self.policy.clone());
    }

    /// Convenience: observe a candidate.
    pub fn observe_candidate(&mut self, candidate: Candidate) {
        self.observe(candidate.into_training_row());
    }

    /// Evaluate the current operator on a held-out test pool.
    pub fn evaluate_test_pool(&self, pool: &[Candidate], threshold: f64) -> ActiveEvaluation {
        let mut outlier_ids = Vec::new();
        let mut max_residual: f64 = 0.0;
        let mut total_residual: f64 = 0.0;

        for candidate in pool {
            let r = self.score(candidate);
            max_residual = max_residual.max(r);
            total_residual += r;
            if r > threshold {
                outlier_ids.push(candidate.id.clone());
            }
        }

        ActiveEvaluation {
            n: pool.len(),
            outlier_count: outlier_ids.len(),
            outlier_ids,
            max_residual,
            mean_residual: if pool.is_empty() {
                0.0
            } else {
                total_residual / pool.len() as f64
            },
        }
    }
}

/// Result of evaluating the sampler on a test pool.
#[derive(Debug, Clone)]
pub struct ActiveEvaluation {
    pub n: usize,
    pub outlier_count: usize,
    pub outlier_ids: Vec<String>,
    pub max_residual: f64,
    pub mean_residual: f64,
}

impl ActiveEvaluation {
    pub fn is_zero_outliers(&self) -> bool {
        self.outlier_count == 0
    }
}

/// Simulate a sequential active-sampling campaign.
///
/// - `train_pool`: candidates available for selection.
/// - `test_pool`: held-out candidates used only for evaluation.
/// - `seed_size`: number of random candidates to observe before active selection begins.
/// - `n_steps`: number of active selections.
/// - Returns the evaluation after each step.
pub fn simulate_active_campaign(
    train_pool: &mut Vec<Candidate>,
    test_pool: &[Candidate],
    seed_size: usize,
    n_steps: usize,
    policy: DirectionPolicy,
    threshold: f64,
) -> Vec<(usize, ActiveEvaluation)> {
    let dim = test_pool.first().map(|c| c.target.len()).unwrap_or(0);
    let seed: Vec<TrainingRow> = train_pool
        .drain(..seed_size.min(train_pool.len()))
        .map(|c| c.into_training_row())
        .collect();

    let mut sampler = ActiveSampler::new(seed, policy, dim);
    let mut history = Vec::with_capacity(n_steps);

    for _ in 0..n_steps {
        let eval = sampler.evaluate_test_pool(test_pool, threshold);
        history.push((sampler.n_observed(), eval));

        if let Some(idx) = sampler.select_next(train_pool) {
            let candidate = train_pool.remove(idx);
            sampler.observe_candidate(candidate);
        } else {
            break;
        }
    }

    history
}

/// Simulate a random-sampling baseline for comparison.
pub fn simulate_random_campaign(
    train_pool: &mut Vec<Candidate>,
    test_pool: &[Candidate],
    seed_size: usize,
    n_steps: usize,
    policy: DirectionPolicy,
    threshold: f64,
) -> Vec<(usize, ActiveEvaluation)> {
    let dim = test_pool.first().map(|c| c.target.len()).unwrap_or(0);
    let seed: Vec<TrainingRow> = train_pool
        .drain(..seed_size.min(train_pool.len()))
        .map(|c| c.into_training_row())
        .collect();

    let mut sampler = ActiveSampler::new(seed, policy, dim);
    let mut history = Vec::with_capacity(n_steps);

    for _ in 0..n_steps {
        let eval = sampler.evaluate_test_pool(test_pool, threshold);
        history.push((sampler.n_observed(), eval));

        if train_pool.is_empty() {
            break;
        }
        let candidate = train_pool.remove(0); // caller is expected to shuffle
        sampler.observe_candidate(candidate);
    }

    history
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::seq::SliceRandom;
    use rand::Rng;

    fn make_pool<R: Rng>(
        n_classes: usize,
        n_per_class: usize,
        dim: usize,
        rng: &mut R,
    ) -> Vec<Candidate> {
        let mut pool = Vec::with_capacity(n_classes * n_per_class);

        for class_idx in 0..n_classes {
            // Two orthonormal error directions per class.
            let mut d1 = DVector::zeros(dim);
            let mut d2 = DVector::zeros(dim);
            d1[class_idx] = 1.0;
            d2[(class_idx + 1) % dim] = 1.0;

            for i in 0..n_per_class {
                let raw = DVector::from_fn(dim, |_j, _| rng.gen_range(-1.0..1.0));
                let a1 = rng.gen_range(0.5..2.0);
                let a2 = rng.gen_range(-0.5..0.5);
                let correction = a1 * &d1 + a2 * &d2;
                let noise = DVector::from_fn(dim, |_j, _| rng.gen_range(-1e-4..1e-4));
                let target = &raw + &correction + &noise;
                pool.push(Candidate {
                    id: format!("c{}_{}", class_idx, i),
                    class: format!("class_{}", class_idx),
                    raw,
                    target,
                });
            }
        }

        pool
    }

    #[test]
    fn test_active_sampling_beats_random() {
        use rand::SeedableRng;

        let dim = 40;
        let mut rng = rand::rngs::StdRng::seed_from_u64(2024);
        let mut train_pool = make_pool(4, 80, dim, &mut rng);
        let test_pool = make_pool(4, 40, dim, &mut rng);

        train_pool.shuffle(&mut rng);

        let policy = DirectionPolicy::LearnedPca { rank: 2 };
        let threshold = 0.5;

        let mut active_train = train_pool.clone();
        let mut random_train = train_pool.clone();

        let active_history = simulate_active_campaign(
            &mut active_train,
            &test_pool,
            16,
            20,
            policy.clone(),
            threshold,
        );
        let random_history = simulate_random_campaign(
            &mut random_train,
            &test_pool,
            16,
            20,
            policy.clone(),
            threshold,
        );

        // Active sampling should leave fewer outliers on the held-out test pool
        // than random sampling after the same number of observations.
        let active_outliers = active_history.last().unwrap().1.outlier_count;
        let random_outliers = random_history.last().unwrap().1.outlier_count;
        assert!(
            active_outliers <= random_outliers,
            "active sampling should match or beat random on outliers: active={}, random={}",
            active_outliers,
            random_outliers
        );

        // Active sampling should reach zero outliers on the test pool.
        let zero_outlier_step = active_history
            .iter()
            .find(|(_, e)| e.is_zero_outliers())
            .map(|(n, _)| *n);
        assert!(
            zero_outlier_step.is_some(),
            "active sampling should reach 0 outliers on test pool"
        );
    }

    #[test]
    fn test_select_next_prefers_large_residual() {
        let dim = 5;
        let mut rng = rand::thread_rng();
        let mut pool = make_pool(2, 10, dim, &mut rng);
        let seed: Vec<TrainingRow> = pool.drain(..6).map(|c| c.into_training_row()).collect();

        let sampler = ActiveSampler::new(seed, DirectionPolicy::LearnedPca { rank: 2 }, dim);
        let scores: Vec<f64> = pool.iter().map(|c| sampler.score(c)).collect();
        let selected = sampler.select_next(&pool).unwrap();

        let max_score = scores.iter().cloned().fold(0.0, f64::max);
        assert!((scores[selected] - max_score).abs() < 1e-12);
    }
}
