//! Protocol Module
//!
//! Defines the NEXLINK wire protocol messages and versioning.
//! All messages are JSON-encoded with a version field.

use serde::{Deserialize, Serialize};

/// Current protocol version.
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// Minimum supported protocol version.
pub const MIN_PROTOCOL_VERSION: &str = "1.0.0";

/// Envelope wrapping all protocol messages.
#[derive(Debug, Serialize, Deserialize)]
pub struct Envelope {
    /// Protocol version
    pub version: String,
    /// Message type discriminator
    pub r#type: String,
    /// Unique message ID for request/response correlation
    pub message_id: String,
    /// Correlation ID for request/response pairing
    pub correlation_id: Option<String>,
    /// Timestamp (ISO 8601)
    pub timestamp: String,
    /// Message payload
    pub payload: serde_json::Value,
}

impl Envelope {
    /// Create a new envelope.
    pub fn new(msg_type: &str, payload: serde_json::Value) -> Self {
        Self {
            version: PROTOCOL_VERSION.to_string(),
            r#type: msg_type.to_string(),
            message_id: uuid::Uuid::new_v4().to_string(),
            correlation_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
            payload,
        }
    }
    
    /// Set correlation ID.
    pub fn with_correlation(mut self, id: &str) -> Self {
        self.correlation_id = Some(id.to_string());
        self
    }
    
    /// Validate the envelope.
    pub fn validate(&self) -> Result<(), ProtocolError> {
        // Check version compatibility
        if !is_version_compatible(&self.version) {
            return Err(ProtocolError::IncompatibleVersion {
                received: self.version.clone(),
                supported: format!(">= {}", MIN_PROTOCOL_VERSION),
            });
        }
        
        // Check message type is known
        if !is_known_message_type(&self.r#type) {
            return Err(ProtocolError::UnknownMessageType {
                msg_type: self.r#type.clone(),
            });
        }
        
        Ok(())
    }
    
    /// Serialize to JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }
    
    /// Deserialize from JSON string.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

/// Protocol errors.
#[derive(Debug, thiserror::Error)]
pub enum ProtocolError {
    #[error("Incompatible protocol version: received {received}, supported {supported}")]
    IncompatibleVersion { received: String, supported: String },
    
    #[error("Unknown message type: {msg_type}")]
    UnknownMessageType { msg_type: String },
    
    #[error("Invalid payload: {reason}")]
    InvalidPayload { reason: String },
    
    #[error("Message too large: {size} bytes (max {max})")]
    MessageTooLarge { size: usize, max: usize },
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Maximum message size (10 MB).
pub const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;

/// Check if a version string is compatible.
/// Uses semantic versioning with major version compatibility check.
/// A version is compatible if its major version is >= the minimum required major version.
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

/// Check if a message type is known.
pub fn is_known_message_type(msg_type: &str) -> bool {
    matches!(msg_type,
        "hello" | "hello_ack" |
        "auth_challenge" | "auth_proof" | "auth_accepted" | "auth_rejected" |
        "ping" | "pong" |
        "metrics_report" |
        "status_update" |
        "session_start" | "session_end" |
        "desktop_frame" | "input_event" |
        "clipboard_sync" |
        "file_transfer_request" | "file_transfer_data" | "file_transfer_complete" |
        "terminal_command" | "terminal_output" |
        "ai_tool_request" | "ai_tool_response" |
        "error" |
        "disconnect"
    )
}

/// Connection state on the wire.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum WireState {
    /// Initial state, no connection
    Idle,
    /// TCP/WebSocket established
    Connected,
    /// Hello exchanged
    Handshaking,
    /// Authentication in progress
    Authenticating,
    /// Fully authenticated and operational
    Active,
    /// Connection lost, attempting recovery
    Reconnecting,
    /// Gracefully closed
    Closed,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_envelope_creation() {
        let envelope = Envelope::new("ping", serde_json::json!({"timestamp": 123}));
        assert_eq!(envelope.version, PROTOCOL_VERSION);
        assert_eq!(envelope.r#type, "ping");
        assert!(!envelope.message_id.is_empty());
    }
    
    #[test]
    fn test_envelope_serialization() {
        let envelope = Envelope::new("ping", serde_json::json!({"ts": 1}));
        let json = envelope.to_json().unwrap();
        let decoded = Envelope::from_json(&json).unwrap();
        assert_eq!(decoded.r#type, "ping");
    }
    
    #[test]
    fn test_envelope_validation() {
        let mut envelope = Envelope::new("ping", serde_json::json!({}));
        assert!(envelope.validate().is_ok());
        
        envelope.version = "99.0.0".to_string();
        // Major version 99 should still be "compatible" (>= 1)
        assert!(envelope.validate().is_ok());
        
        envelope.r#type = "unknown_type".to_string();
        assert!(envelope.validate().is_err());
    }
    
    #[test]
    fn test_version_compatibility() {
        assert!(is_version_compatible("1.0.0"));
        assert!(is_version_compatible("1.1.0"));
        assert!(is_version_compatible("2.0.0"));
        assert!(!is_version_compatible("0.9.0"));
    }
    
    #[test]
    fn test_known_message_types() {
        assert!(is_known_message_type("hello"));
        assert!(is_known_message_type("ping"));
        assert!(is_known_message_type("ai_tool_request"));
        assert!(!is_known_message_type("invalid"));
        assert!(!is_known_message_type(""));
    }
    
    #[test]
    fn test_correlation() {
        let envelope = Envelope::new("auth_proof", serde_json::json!({}))
            .with_correlation("req-123");
        assert_eq!(envelope.correlation_id, Some("req-123".to_string()));
    }
}
