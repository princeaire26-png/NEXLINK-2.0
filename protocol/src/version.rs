//! Protocol versioning.

/// Current protocol version.
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// Minimum supported protocol version.
pub const MIN_PROTOCOL_VERSION: &str = "1.0.0";

/// Maximum message size in bytes (10 MB).
pub const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;

/// Check if a version string is compatible with this implementation.
pub fn is_version_compatible(version: &str) -> bool {
    let parts: Vec<&str> = version.split('.').collect();
    let min_parts: Vec<&str> = MIN_PROTOCOL_VERSION.split('.').collect();
    
    if parts.is_empty() || min_parts.is_empty() {
        return false;
    }
    
    let major: u32 = parts[0].parse().unwrap_or(0);
    let min_major: u32 = min_parts[0].parse().unwrap_or(0);
    
    major >= min_major
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_version_compatibility() {
        assert!(is_version_compatible("1.0.0"));
        assert!(is_version_compatible("1.1.0"));
        assert!(is_version_compatible("2.0.0"));
        assert!(!is_version_compatible("0.9.0"));
        assert!(!is_version_compatible(""));
    }
}
