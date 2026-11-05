//! Protocol error types.

use thiserror::Error;

/// Protocol errors.
#[derive(Debug, Error)]
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
    
    #[error("Authentication required")]
    AuthenticationRequired,
    
    #[error("Permission denied: {reason}")]
    PermissionDenied { reason: String },
    
    #[error("Session expired")]
    SessionExpired,
    
    #[error("Device not approved")]
    DeviceNotApproved,
}
