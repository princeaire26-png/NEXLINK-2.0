//! Protocol envelope wrapping all messages.

use serde::{Deserialize, Serialize};
use crate::version::PROTOCOL_VERSION;

/// Envelope wrapping all protocol messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    /// Protocol version
    pub version: String,
    /// Message type discriminator
    pub r#type: String,
    /// Unique message ID
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
    
    /// Serialize to JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }
    
    /// Deserialize from JSON string.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
    
    /// Validate the envelope.
    pub fn validate(&self) -> Result<(), crate::error::ProtocolError> {
        if !crate::version::is_version_compatible(&self.version) {
            return Err(crate::error::ProtocolError::IncompatibleVersion {
                received: self.version.clone(),
                supported: format!(">= {}", crate::version::MIN_PROTOCOL_VERSION),
            });
        }
        
        if !crate::messages::is_known_message_type(&self.r#type) {
            return Err(crate::error::ProtocolError::UnknownMessageType {
                msg_type: self.r#type.clone(),
            });
        }
        
        Ok(())
    }
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
        let envelope = Envelope::new("ping", serde_json::json!({}));
        assert!(envelope.validate().is_ok());
    }
}
