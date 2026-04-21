//! Provenance Digesting
//!
//! FNV-1a 64-bit hash for lightweight, deterministic provenance digests.
//! Used when cryptographic hashing dependencies are unavailable.
//! Provides stable content addressing for distillation artifacts.

/// Compute FNV-1a 64-bit hash as a hex string.
///
/// This is a non-cryptographic hash suitable for content-addressing
/// distillation artifacts. The digest is deterministic and stable
/// across platforms.
///
/// # Example
/// ```
/// use atlas_distill::domain::provenance::fnv1a64_hex;
/// assert_eq!(fnv1a64_hex(b"hello"), "a430d84680aabd0b");
/// ```
pub fn fnv1a64_hex(input: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::fnv1a64_hex;

    #[test]
    fn digest_is_stable() {
        // Known-good value from the ODF reference implementation
        assert_eq!(fnv1a64_hex(b"open-distillation-factory"), "ef658f42f8591f87");
    }

    #[test]
    fn empty_input_has_known_hash() {
        // FNV-1a offset basis as hex
        assert_eq!(fnv1a64_hex(b""), "cbf29ce484222325");
    }

    #[test]
    fn different_inputs_differ() {
        assert_ne!(fnv1a64_hex(b"Al-FCC"), fnv1a64_hex(b"Cu-FCC"));
    }
}
