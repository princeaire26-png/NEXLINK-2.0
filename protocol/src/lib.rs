//! NEXLINK Protocol
//!
//! Canonical protocol definitions for communication between
//! NEXLINK Agent, Server, and Clients.
//!
//! All messages are JSON-encoded with version negotiation.

pub mod messages;
pub mod envelope;
pub mod error;
pub mod version;

pub use envelope::Envelope;
pub use error::ProtocolError;
pub use version::{PROTOCOL_VERSION, MIN_PROTOCOL_VERSION, is_version_compatible};
