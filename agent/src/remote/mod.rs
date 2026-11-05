//! Remote Desktop Module
//!
//! Phase 8: Remote Desktop MVP implementation.
//! Provides screen capture, encoding, and session management.

pub mod capture;
pub mod encoder;
pub mod session;

pub use capture::{CapturedFrame, ScreenCapture, MonitorInfo, PixelFormat};
pub use encoder::{EncodedFrame, FrameEncoder, EncoderConfig, FrameEncoding};
pub use session::{RemoteSession, SessionConfig, SessionState, SessionMetrics};
