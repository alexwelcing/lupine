mod dump;
mod log;
mod data;
mod xyz;
mod types;

use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// Re-export the public API
pub use dump::*;
pub use log::*;
pub use data::*;
pub use xyz::*;
pub use types::*;
