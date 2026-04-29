pub mod arrhenius;
pub mod levenberg;
pub mod linear;
pub mod polynomial;
pub mod power_law;
pub mod symbolic;

/// Common fit result returned by all fitting routines.
#[derive(Debug, Clone)]
pub struct FitResult {
    /// Model name (e.g. "power_law", "arrhenius")
    pub model: String,
    /// Human-readable equation string (e.g. "y = 2.34 * x^0.67")
    pub equation: String,
    /// Fitted parameter values
    pub params: Vec<f64>,
    /// Parameter names
    pub param_names: Vec<String>,
    /// Coefficient of determination
    pub r_squared: f64,
    /// Root mean square of residuals
    pub residual_rms: f64,
    /// Number of data points used
    pub n_points: usize,
}

impl FitResult {
    pub fn new(
        model: &str,
        equation: &str,
        params: Vec<f64>,
        param_names: Vec<String>,
        r_squared: f64,
        residual_rms: f64,
        n_points: usize,
    ) -> Self {
        Self {
            model: model.to_string(),
            equation: equation.to_string(),
            params,
            param_names,
            r_squared,
            residual_rms,
            n_points,
        }
    }
}
