pub struct Cortex {
    // Model state
}

impl Cortex {
    pub fn think(prompt: &str) -> String {
        format!("[Cortex] Thinking about: {}", prompt)
    }
}
