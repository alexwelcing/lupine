//! Symbolic regression via genetic programming.
//!
//! Evolves mathematical expressions as trees to find the simplest
//! equation that fits the data. This is where genuinely new
//! mathematics gets discovered.

use crate::fitting::FitResult;
use rand::prelude::*;
use std::fmt;

/// Expression tree node.
#[derive(Debug, Clone)]
pub enum Expr {
    /// Constant value
    Const(f64),
    /// Independent variable x
    Var,
    /// a + b
    Add(Box<Expr>, Box<Expr>),
    /// a * b
    Mul(Box<Expr>, Box<Expr>),
    /// a ^ b (power)
    Pow(Box<Expr>, Box<Expr>),
    /// exp(a)
    Exp(Box<Expr>),
    /// ln(a)
    Log(Box<Expr>),
    /// -a (negate)
    Neg(Box<Expr>),
    /// a / b
    Div(Box<Expr>, Box<Expr>),
}

impl Expr {
    /// Evaluate the expression at x.
    pub fn eval(&self, x: f64) -> f64 {
        match self {
            Expr::Const(c) => *c,
            Expr::Var => x,
            Expr::Add(a, b) => a.eval(x) + b.eval(x),
            Expr::Mul(a, b) => a.eval(x) * b.eval(x),
            Expr::Pow(base, exp) => {
                let b = base.eval(x);
                let e = exp.eval(x);
                if b <= 0.0 && e.fract() != 0.0 {
                    f64::NAN
                } else {
                    b.powf(e)
                }
            }
            Expr::Exp(a) => {
                let v = a.eval(x);
                if v > 500.0 {
                    f64::INFINITY
                } else {
                    v.exp()
                }
            }
            Expr::Log(a) => {
                let v = a.eval(x);
                if v <= 0.0 {
                    f64::NAN
                } else {
                    v.ln()
                }
            }
            Expr::Neg(a) => -a.eval(x),
            Expr::Div(a, b) => {
                let denom = b.eval(x);
                if denom.abs() < 1e-30 {
                    f64::NAN
                } else {
                    a.eval(x) / denom
                }
            }
        }
    }

    /// Count the number of nodes in the tree (complexity measure).
    pub fn complexity(&self) -> usize {
        match self {
            Expr::Const(_) | Expr::Var => 1,
            Expr::Neg(a) | Expr::Exp(a) | Expr::Log(a) => 1 + a.complexity(),
            Expr::Add(a, b) | Expr::Mul(a, b) | Expr::Pow(a, b) | Expr::Div(a, b) => {
                1 + a.complexity() + b.complexity()
            }
        }
    }

    /// Generate a random expression tree.
    fn random(rng: &mut impl Rng, max_depth: usize) -> Self {
        if max_depth <= 1 {
            // Terminal
            if rng.gen_bool(0.5) {
                Expr::Var
            } else {
                Expr::Const(random_constant(rng))
            }
        } else {
            match rng.gen_range(0..10) {
                0 => Expr::Var,
                1 => Expr::Const(random_constant(rng)),
                2 => Expr::Add(
                    Box::new(Expr::random(rng, max_depth - 1)),
                    Box::new(Expr::random(rng, max_depth - 1)),
                ),
                3 => Expr::Mul(
                    Box::new(Expr::random(rng, max_depth - 1)),
                    Box::new(Expr::random(rng, max_depth - 1)),
                ),
                4 => Expr::Pow(
                    Box::new(Expr::random(rng, max_depth - 1)),
                    Box::new(Expr::Const(rng.gen_range(-3.0..4.0_f64).round())),
                ),
                5 => Expr::Exp(Box::new(Expr::random(rng, max_depth - 1))),
                6 => Expr::Log(Box::new(Expr::random(rng, max_depth - 1))),
                7 => Expr::Neg(Box::new(Expr::random(rng, max_depth - 1))),
                8 => Expr::Div(
                    Box::new(Expr::random(rng, max_depth - 1)),
                    Box::new(Expr::random(rng, max_depth - 1)),
                ),
                _ => Expr::Mul(
                    Box::new(Expr::Const(random_constant(rng))),
                    Box::new(Expr::Var),
                ),
            }
        }
    }

    /// Mutate the expression tree at a random node.
    fn mutate(&self, rng: &mut impl Rng) -> Self {
        // With some probability, replace this entire subtree
        if rng.gen_bool(0.2) {
            return Expr::random(rng, 3);
        }

        match self {
            Expr::Const(c) => {
                // Perturb the constant
                Expr::Const(c + rng.gen_range(-1.0..1.0))
            }
            Expr::Var => {
                if rng.gen_bool(0.3) {
                    Expr::Mul(
                        Box::new(Expr::Const(random_constant(rng))),
                        Box::new(Expr::Var),
                    )
                } else {
                    Expr::Var
                }
            }
            Expr::Add(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Add(Box::new(a.mutate(rng)), b.clone())
                } else {
                    Expr::Add(a.clone(), Box::new(b.mutate(rng)))
                }
            }
            Expr::Mul(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Mul(Box::new(a.mutate(rng)), b.clone())
                } else {
                    Expr::Mul(a.clone(), Box::new(b.mutate(rng)))
                }
            }
            Expr::Pow(base, exp) => {
                if rng.gen_bool(0.3) {
                    Expr::Pow(Box::new(base.mutate(rng)), exp.clone())
                } else {
                    Expr::Pow(base.clone(), Box::new(Expr::Const(rng.gen_range(-3.0..4.0_f64).round())))
                }
            }
            Expr::Exp(a) => Expr::Exp(Box::new(a.mutate(rng))),
            Expr::Log(a) => Expr::Log(Box::new(a.mutate(rng))),
            Expr::Neg(a) => Expr::Neg(Box::new(a.mutate(rng))),
            Expr::Div(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Div(Box::new(a.mutate(rng)), b.clone())
                } else {
                    Expr::Div(a.clone(), Box::new(b.mutate(rng)))
                }
            }
        }
    }

    /// Crossover: swap a random subtree with one from another expression.
    fn crossover(&self, other: &Expr, rng: &mut impl Rng) -> Self {
        if rng.gen_bool(0.3) {
            return other.clone();
        }

        match self {
            Expr::Const(_) | Expr::Var => {
                if rng.gen_bool(0.5) {
                    other.clone()
                } else {
                    self.clone()
                }
            }
            Expr::Add(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Add(Box::new(a.crossover(other, rng)), b.clone())
                } else {
                    Expr::Add(a.clone(), Box::new(b.crossover(other, rng)))
                }
            }
            Expr::Mul(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Mul(Box::new(a.crossover(other, rng)), b.clone())
                } else {
                    Expr::Mul(a.clone(), Box::new(b.crossover(other, rng)))
                }
            }
            Expr::Pow(base, exp) => Expr::Pow(Box::new(base.crossover(other, rng)), exp.clone()),
            Expr::Exp(a) => Expr::Exp(Box::new(a.crossover(other, rng))),
            Expr::Log(a) => Expr::Log(Box::new(a.crossover(other, rng))),
            Expr::Neg(a) => Expr::Neg(Box::new(a.crossover(other, rng))),
            Expr::Div(a, b) => {
                if rng.gen_bool(0.5) {
                    Expr::Div(Box::new(a.crossover(other, rng)), b.clone())
                } else {
                    Expr::Div(a.clone(), Box::new(b.crossover(other, rng)))
                }
            }
        }
    }
}

fn random_constant(rng: &mut impl Rng) -> f64 {
    // Mix of small integers and random floats
    if rng.gen_bool(0.3) {
        rng.gen_range(-5..=5) as f64
    } else {
        rng.gen_range(-10.0..10.0)
    }
}

impl fmt::Display for Expr {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Expr::Const(c) => {
                if c.fract() == 0.0 && c.abs() < 1e6 {
                    write!(f, "{}", *c as i64)
                } else {
                    write!(f, "{:.4e}", c)
                }
            }
            Expr::Var => write!(f, "x"),
            Expr::Add(a, b) => write!(f, "({} + {})", a, b),
            Expr::Mul(a, b) => write!(f, "({} · {})", a, b),
            Expr::Pow(a, b) => write!(f, "{}^{}", a, b),
            Expr::Exp(a) => write!(f, "exp({})", a),
            Expr::Log(a) => write!(f, "ln({})", a),
            Expr::Neg(a) => write!(f, "(-{})", a),
            Expr::Div(a, b) => write!(f, "({} / {})", a, b),
        }
    }
}

/// Score an expression on data: lower is better.
/// Combined metric: MSE + parsimony pressure (prefer simpler expressions).
fn score(expr: &Expr, data: &[(f64, f64)], parsimony: f64) -> f64 {
    let n = data.len();
    if n == 0 {
        return f64::INFINITY;
    }

    let mut sse = 0.0;
    for (x, y) in data {
        let pred = expr.eval(*x);
        if pred.is_nan() || pred.is_infinite() {
            return f64::INFINITY;
        }
        sse += (y - pred).powi(2);
    }

    let mse = sse / n as f64;
    let complexity_penalty = parsimony * expr.complexity() as f64;

    mse + complexity_penalty
}

/// Run symbolic regression via genetic programming.
///
/// * `data` — (x, y) pairs
/// * `population_size` — number of individuals
/// * `generations` — number of evolution generations
///
/// Returns the best expression found.
pub fn symbolic_regression(
    data: &[(f64, f64)],
    population_size: usize,
    generations: usize,
) -> Expr {
    let mut rng = StdRng::seed_from_u64(42);
    let parsimony = 0.01; // Penalize complexity lightly

    // Initialize population
    let mut population: Vec<Expr> = (0..population_size)
        .map(|_| Expr::random(&mut rng, 4))
        .collect();

    // Seed with common physical forms
    population.push(Expr::Mul(
        Box::new(Expr::Const(1.0)),
        Box::new(Expr::Pow(Box::new(Expr::Var), Box::new(Expr::Const(2.0)))),
    )); // a * x^2
    population.push(Expr::Mul(
        Box::new(Expr::Const(1.0)),
        Box::new(Expr::Exp(Box::new(Expr::Mul(
            Box::new(Expr::Const(-1.0)),
            Box::new(Expr::Var),
        )))),
    )); // a * exp(-x)
    population.push(Expr::Mul(
        Box::new(Expr::Const(1.0)),
        Box::new(Expr::Pow(Box::new(Expr::Var), Box::new(Expr::Const(0.5)))),
    )); // a * x^0.5

    let mut best_expr = Expr::Const(0.0);
    let mut best_score = f64::INFINITY;

    for _gen in 0..generations {
        // Evaluate fitness
        let mut scored: Vec<(f64, usize)> = population
            .iter()
            .enumerate()
            .map(|(i, expr)| (score(expr, data, parsimony), i))
            .collect();

        scored.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Greater));

        // Track best
        if scored[0].0 < best_score {
            best_score = scored[0].0;
            best_expr = population[scored[0].1].clone();
        }

        // Early exit if fit is very good
        if best_score < 1e-10 {
            break;
        }

        // Selection: keep top 30%
        let elite_count = (population_size as f64 * 0.3) as usize;
        let elite: Vec<Expr> = scored[..elite_count]
            .iter()
            .map(|(_, i)| population[*i].clone())
            .collect();

        let mut new_pop = elite.clone();

        // Fill rest via crossover and mutation
        while new_pop.len() < population_size {
            let parent_a = &elite[rng.gen_range(0..elite.len())];
            let parent_b = &elite[rng.gen_range(0..elite.len())];

            let mut child = parent_a.crossover(parent_b, &mut rng);

            // Mutation
            if rng.gen_bool(0.4) {
                child = child.mutate(&mut rng);
            }

            // Reject overly complex expressions
            if child.complexity() <= 20 {
                new_pop.push(child);
            }
        }

        population = new_pop;
    }

    best_expr
}

/// Convenience wrapper returning a FitResult.
pub fn symbolic_fit(data: &[(f64, f64)], pop_size: usize, generations: usize) -> FitResult {
    let expr = symbolic_regression(data, pop_size, generations);

    let y_mean = data.iter().map(|(_, y)| y).sum::<f64>() / data.len() as f64;
    let ss_tot: f64 = data.iter().map(|(_, y)| (y - y_mean).powi(2)).sum();
    let ss_res: f64 = data
        .iter()
        .map(|(x, y)| {
            let pred = expr.eval(*x);
            if pred.is_finite() {
                (y - pred).powi(2)
            } else {
                y.powi(2)
            }
        })
        .sum();

    let r_squared = if ss_tot > 1e-30 { 1.0 - ss_res / ss_tot } else { 0.0 };
    let rms = (ss_res / data.len() as f64).sqrt();

    let equation = format!("y = {}", expr);

    FitResult::new(
        "symbolic",
        &equation,
        vec![],
        vec![],
        r_squared,
        rms,
        data.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expr_eval() {
        // x^2
        let expr = Expr::Pow(Box::new(Expr::Var), Box::new(Expr::Const(2.0)));
        assert!((expr.eval(3.0) - 9.0).abs() < 1e-10);
        assert!((expr.eval(5.0) - 25.0).abs() < 1e-10);
    }

    #[test]
    fn test_symbolic_discovers_linear() {
        // y = 3x + 1
        let data: Vec<(f64, f64)> = (0..20)
            .map(|i| {
                let x = i as f64;
                (x, 3.0 * x + 1.0)
            })
            .collect();

        let fit = symbolic_fit(&data, 200, 40);
        assert!(
            fit.r_squared > 0.95,
            "Should discover linear relationship, R² = {}",
            fit.r_squared
        );
    }

    #[test]
    fn test_symbolic_discovers_power_law() {
        // y = 2 * x^2
        let data: Vec<(f64, f64)> = (1..=15)
            .map(|i| {
                let x = i as f64;
                (x, 2.0 * x.powi(2))
            })
            .collect();

        let fit = symbolic_fit(&data, 300, 50);
        assert!(
            fit.r_squared > 0.90,
            "Should discover power law, R² = {}",
            fit.r_squared
        );
    }

    #[test]
    fn test_complexity() {
        let expr = Expr::Add(
            Box::new(Expr::Mul(
                Box::new(Expr::Const(2.0)),
                Box::new(Expr::Var),
            )),
            Box::new(Expr::Const(1.0)),
        );
        assert_eq!(expr.complexity(), 5); // Add + Mul + Const + Var + Const
    }
}
