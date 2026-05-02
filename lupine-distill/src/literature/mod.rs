//! Literature integration — bridges the engine's geometric findings to the
//! published literature for hypothesis grounding and gap detection.
//!
//! Two layers:
//!   - `search`: HTTP client for Semantic Scholar's public search API (no
//!     auth needed at low rates, returns JSON). The worker's
//!     `/literature/search` endpoint is still a stub; we go direct.
//!   - `investigate`: orchestrator that pulls our findings about an element,
//!     queries S2, routes abstracts through the existing DSPy `Mine` bridge,
//!     compares extracted benchmark values to our DB, and emits
//!     `LiteratureComputationGap` claims when reality and literature
//!     disagree by more than `GAP_THRESHOLD_PCT`.

pub mod search;
pub mod investigate;
