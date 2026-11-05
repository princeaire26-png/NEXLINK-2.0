//! Remote Session Manager
//!
//! Manages the lifecycle of remote desktop sessions on the agent side.
//! Handles screen capture, encoding, and frame streaming.

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tracing::{info, warn, error, debug};

use super::capture::{create_screen_capture, CapturedFrame, ScreenCapture};
use super::encoder::{EncoderConfig, FrameEncoder, EncodedFrame};

/// Remote session state.
#[derive(Debug, Clone, PartialEq)]
pub enum SessionState {
    Disconnected,
    Connecting,
    Authenticating,
    Active,
    Paused,
    Terminating,
    Terminated,
}

/// Remote session configuration.
#[derive(Debug, Clone)]
pub struct SessionConfig {
    pub session_id: String,
    pub target_fps: u32,
    pub encoder_config: EncoderConfig,
}

/// Remote session manager.
pub struct RemoteSession {
    config: SessionConfig,
    state: Arc<Mutex<SessionState>>,
    capture: Option<Box<dyn ScreenCapture>>,
    encoder: FrameEncoder,
    frame_tx: Option<mpsc::Sender<EncodedFrame>>,
    metrics: SessionMetrics,
}

/// Session metrics.
#[derive(Debug, Clone, Default)]
pub struct SessionMetrics {
    pub frames_captured: u64,
    pub frames_encoded: u64,
    pub frames_sent: u64,
    pub bytes_sent: u64,
    pub dropped_frames: u64,
    pub start_time: Option<i64>,
}

impl RemoteSession {
    /// Create a new remote session.
    pub fn new(config: SessionConfig) -> Self {
        Self {
            config,
            state: Arc::new(Mutex::new(SessionState::Disconnected)),
            capture: None,
            encoder: FrameEncoder::new(config.encoder_config.clone()),
            frame_tx: None,
            metrics: SessionMetrics::default(),
        }
    }
    
    /// Initialize the session (capture system, etc).
    pub async fn init(&mut self) -> Result<()> {
        let mut state = self.state.lock().await;
        *state = SessionState::Connecting;
        drop(state);
        
        info!("Initializing remote session {}", self.config.session_id);
        
        // Initialize screen capture
        let mut capture = create_screen_capture()?;
        capture.init()?;
        
        // Get screen dimensions
        let (width, height) = capture.get_primary_dimensions()?;
        info!("Primary screen: {}x{}", width, height);
        
        self.capture = Some(capture);
        
        let mut state = self.state.lock().await;
        *state = SessionState::Active;
        
        self.metrics.start_time = Some(chrono::Utc::now().timestamp());
        
        Ok(())
    }
    
    /// Set the frame output channel.
    pub fn set_frame_sender(&mut self, tx: mpsc::Sender<EncodedFrame>) {
        self.frame_tx = Some(tx);
    }
    
    /// Run the capture loop.
    pub async fn run(&mut self) -> Result<()> {
        let frame_interval = std::time::Duration::from_millis(1000 / self.config.target_fps as u64);
        let mut interval = tokio::time::interval(frame_interval);
        
        info!("Starting capture loop at {} FPS", self.config.target_fps);
        
        loop {
            interval.tick().await;
            
            // Check session state
            let state = self.state.lock().await.clone();
            if state == SessionState::Terminated || state == SessionState::Terminating {
                info!("Session terminating");
                break;
            }
            
            if state == SessionState::Paused {
                continue;
            }
            
            // Capture frame
            if let Some(capture) = &mut self.capture {
                match capture.capture_frame() {
                    Ok(frame) => {
                        self.metrics.frames_captured += 1;
                        
                        // Encode frame
                        match self.encoder.encode(&frame) {
                            Ok(encoded) => {
                                self.metrics.frames_encoded += 1;
                                
                                // Send to output channel
                                if let Some(tx) = &self.frame_tx {
                                    match tx.try_send(encoded.clone()) {
                                        Ok(_) => {
                                            self.metrics.frames_sent += 1;
                                            self.metrics.bytes_sent += encoded.data.len() as u64;
                                        }
                                        Err(mpsc::error::TrySendError::Full(_)) => {
                                            self.metrics.dropped_frames += 1;
                                            debug!("Frame dropped (channel full)");
                                        }
                                        Err(mpsc::error::TrySendError::Closed(_)) => {
                                            warn!("Frame channel closed");
                                            break;
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                error!("Failed to encode frame: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to capture frame: {}", e);
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Terminate the session.
    pub async fn terminate(&mut self) -> Result<()> {
        let mut state = self.state.lock().await;
        *state = SessionState::Terminating;
        drop(state);
        
        info!("Terminating session {}", self.config.session_id);
        
        // Cleanup capture
        if let Some(capture) = &mut self.capture {
            capture.cleanup()?;
        }
        
        let mut state = self.state.lock().await;
        *state = SessionState::Terminated;
        
        Ok(())
    }
    
    /// Get current session state.
    pub async fn state(&self) -> SessionState {
        self.state.lock().await.clone()
    }
    
    /// Get session metrics.
    pub fn metrics(&self) -> &SessionMetrics {
        &self.metrics
    }
    
    /// Get session ID.
    pub fn session_id(&self) -> &str {
        &self.config.session_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_session_creation() {
        let config = SessionConfig {
            session_id: "test-session".to_string(),
            target_fps: 30,
            encoder_config: EncoderConfig::default(),
        };
        
        let session = RemoteSession::new(config);
        assert_eq!(session.session_id(), "test-session");
    }
    
    #[tokio::test]
    async fn test_session_state_transitions() {
        let config = SessionConfig {
            session_id: "test".to_string(),
            target_fps: 10,
            encoder_config: EncoderConfig::default(),
        };
        
        let session = RemoteSession::new(config);
        assert_eq!(session.state().await, SessionState::Disconnected);
    }
}
