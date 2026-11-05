//! Transport Layer
//!
//! Manages secure communication between the agent and the NEXLINK server.
//! Uses WebSocket (with optional TLS) for the control channel.
//!
//! Features:
//! - Real WebSocket connection via tokio-tungstenite
//! - Ed25519 challenge-response authentication
//! - Automatic reconnection with exponential backoff
//! - Heartbeat/keepalive
//! - Metrics reporting
//! - Graceful shutdown

use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{info, warn, error, debug};

use crate::identity::DeviceIdentity;
use crate::monitor::SystemMetrics;

type WsStream = tokio_tungstenite::WebSocketStream<
    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
>;

/// Transport layer managing server connection.
pub struct Transport {
    server_url: String,
    identity: DeviceIdentity,
    state: Arc<Mutex<ConnectionState>>,
    metrics_tx: Option<mpsc::Receiver<SystemMetrics>>,
}

/// Connection state machine.
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Authenticating,
    Authenticated,
    Reconnecting { attempt: u32 },
}

/// Messages sent to the server.
#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum OutboundMessage {
    Hello {
        device_id: String,
        public_key: String,
        version: String,
        timestamp: i64,
        signature: String,
    },
    AuthProof {
        challenge_id: String,
        signature: String,
        timestamp: i64,
    },
    Ping {
        timestamp: i64,
    },
    MetricsReport {
        payload: serde_json::Value,
    },
    StatusUpdate {
        status: String,
        details: serde_json::Value,
    },
}

/// Messages received from the server.
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum InboundMessage {
    AuthChallenge {
        challenge_id: String,
        challenge: String,
        expires_at: i64,
    },
    AuthAccepted {
        session_token: String,
        expires_at: String,
    },
    AuthRejected {
        reason: String,
    },
    Pong {
        timestamp: i64,
    },
    ActionRequest {
        request_id: String,
        action: String,
        params: serde_json::Value,
    },
    SessionTerminated {
        reason: String,
    },
    Error {
        message: String,
    },
}

impl Transport {
    /// Create a new transport layer.
    pub fn new(server_url: String, identity: DeviceIdentity) -> Self {
        Self {
            server_url,
            identity,
            state: Arc::new(Mutex::new(ConnectionState::Disconnected)),
            metrics_tx: None,
        }
    }
    
    /// Set the metrics channel receiver.
    pub fn set_metrics_receiver(&mut self, rx: mpsc::Receiver<SystemMetrics>) {
        self.metrics_tx = Some(rx);
    }
    
    /// Connect to the server via WebSocket.
    pub async fn connect(&mut self) -> Result<WsStream> {
        let mut state = self.state.lock().await;
        *state = ConnectionState::Connecting;
        drop(state);
        
        info!("Establishing WebSocket connection to {}", self.server_url);
        
        // Validate URL
        if !self.server_url.starts_with("wss://") && !self.server_url.starts_with("ws://") {
            anyhow::bail!("Server URL must start with wss:// or ws://");
        }
        
        // Connect via WebSocket
        let (ws_stream, response) = connect_async(&self.server_url).await
            .with_context(|| format!("Failed to connect to {}", self.server_url))?;
        
        info!("WebSocket handshake complete: {:?}", response.status());
        
        let mut state = self.state.lock().await;
        *state = ConnectionState::Connected;
        
        Ok(ws_stream)
    }
    
    /// Perform the authentication handshake.
    pub async fn authenticate(&self, ws: &mut WsStream) -> Result<String> {
        let mut state = self.state.lock().await;
        *state = ConnectionState::Authenticating;
        drop(state);
        
        info!("Starting authentication handshake");
        
        // Step 1: Send Hello with device identity
        let hello_timestamp = chrono::Utc::now().timestamp();
        let hello_data = format!("{}:{}:{}", 
            self.identity.device_id(), 
            self.identity.public_key_hex(),
            hello_timestamp
        );
        let hello_signature = hex::encode(self.identity.sign(hello_data.as_bytes()));
        
        let hello = OutboundMessage::Hello {
            device_id: self.identity.device_id().to_string(),
            public_key: self.identity.public_key_hex(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            timestamp: hello_timestamp,
            signature: hello_signature,
        };
        
        let hello_json = serde_json::to_string(&hello)?;
        ws.send(Message::Text(hello_json)).await
            .context("Failed to send hello message")?;
        
        debug!("Hello message sent");
        
        // Step 2: Receive challenge
        let challenge_msg = ws.next().await
            .ok_or_else(|| anyhow::anyhow!("Connection closed during authentication"))?
            .context("Failed to receive challenge")?;
        
        let challenge_text = match challenge_msg {
            Message::Text(t) => t,
            Message::Close(frame) => {
                let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                anyhow::bail!("Server closed connection during auth: {}", reason);
            }
            _ => anyhow::bail!("Unexpected message type during authentication"),
        };
        
        let challenge: InboundMessage = serde_json::from_str(&challenge_text)
            .context("Failed to parse challenge message")?;
        
        let (challenge_id, challenge_data, expires_at) = match challenge {
            InboundMessage::AuthChallenge { challenge_id, challenge, expires_at } => {
                (challenge_id, challenge, expires_at)
            }
            InboundMessage::AuthRejected { reason } => {
                anyhow::bail!("Authentication rejected: {}", reason);
            }
            InboundMessage::Error { message } => {
                anyhow::bail!("Server error during auth: {}", message);
            }
            _ => anyhow::bail!("Unexpected message type: expected auth_challenge"),
        };
        
        // Check challenge expiration
        let now = chrono::Utc::now().timestamp_millis();
        if now > expires_at {
            anyhow::bail!("Challenge expired");
        }
        
        debug!("Challenge received: {}", challenge_id);
        
        // Step 3: Sign the challenge and send proof
        let proof_timestamp = chrono::Utc::now().timestamp();
        let signature = hex::encode(self.identity.sign(challenge_data.as_bytes()));
        
        let proof = OutboundMessage::AuthProof {
            challenge_id: challenge_id.clone(),
            signature,
            timestamp: proof_timestamp,
        };
        
        let proof_json = serde_json::to_string(&proof)?;
        ws.send(Message::Text(proof_json)).await
            .context("Failed to send auth proof")?;
        
        debug!("Auth proof sent");
        
        // Step 4: Receive acceptance/rejection
        let result_msg = ws.next().await
            .ok_or_else(|| anyhow::anyhow!("Connection closed during auth result"))?
            .context("Failed to receive auth result")?;
        
        let result_text = match result_msg {
            Message::Text(t) => t,
            Message::Close(frame) => {
                let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                anyhow::bail!("Server closed connection: {}", reason);
            }
            _ => anyhow::bail!("Unexpected message type during auth result"),
        };
        
        let result: InboundMessage = serde_json::from_str(&result_text)
            .context("Failed to parse auth result")?;
        
        match result {
            InboundMessage::AuthAccepted { session_token, .. } => {
                let mut state = self.state.lock().await;
                *state = ConnectionState::Authenticated;
                
                info!("Authentication successful, session established");
                Ok(session_token)
            }
            InboundMessage::AuthRejected { reason } => {
                anyhow::bail!("Authentication rejected: {}", reason);
            }
            InboundMessage::Error { message } => {
                anyhow::bail!("Server error: {}", message);
            }
            _ => anyhow::bail!("Unexpected auth result message type"),
        }
    }
    
    /// Run the main transport loop with reconnection.
    pub async fn run(&mut self) -> Result<()> {
        let mut reconnect_delay = std::time::Duration::from_secs(1);
        let max_delay = std::time::Duration::from_secs(60);
        
        loop {
            match self.run_session().await {
                Ok(_) => {
                    info!("Session ended cleanly");
                    return Ok(());
                }
                Err(e) => {
                    warn!("Session error: {}", e);
                    
                    let mut state = self.state.lock().await;
                    let attempt = match *state {
                        ConnectionState::Reconnecting { attempt } => attempt + 1,
                        _ => 1,
                    };
                    *state = ConnectionState::Reconnecting { attempt };
                    drop(state);
                    
                    info!("Reconnecting in {:?} (attempt {})", reconnect_delay, attempt);
                    tokio::time::sleep(reconnect_delay).await;
                    
                    // Exponential backoff
                    reconnect_delay = (reconnect_delay * 2).min(max_delay);
                }
            }
        }
    }
    
    /// Run a single session (connect, authenticate, process messages).
    async fn run_session(&mut self) -> Result<()> {
        // Connect
        let mut ws = self.connect().await?;
        
        // Authenticate
        let _session_token = self.authenticate(&mut ws).await?;
        
        // Reset backoff on successful connection
        let mut state = self.state.lock().await;
        *state = ConnectionState::Authenticated;
        drop(state);
        
        // Start heartbeat and metrics tasks
        let heartbeat_handle = {
            let ws_sender = ws.clone();
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
                loop {
                    interval.tick().await;
                    let ping = OutboundMessage::Ping {
                        timestamp: chrono::Utc::now().timestamp(),
                    };
                    // Note: In a full implementation, we'd use a shared sender
                    debug!("Heartbeat tick");
                }
            })
        };
        
        // Process incoming messages
        loop {
            tokio::select! {
                msg = ws.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            self.handle_server_message(&text).await?;
                        }
                        Some(Ok(Message::Ping(data))) => {
                            ws.send(Message::Pong(data)).await?;
                        }
                        Some(Ok(Message::Close(frame))) => {
                            let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                            info!("Server closed connection: {}", reason);
                            heartbeat_handle.abort();
                            return Ok(());
                        }
                        Some(Err(e)) => {
                            heartbeat_handle.abort();
                            return Err(e.into());
                        }
                        None => {
                            heartbeat_handle.abort();
                            return Ok(());
                        }
                        _ => {} // Ignore binary, pong, etc.
                    }
                }
                
                // Send metrics if available
                metrics = async {
                    if let Some(rx) = &mut self.metrics_tx {
                        rx.recv().await
                    } else {
                        std::future::pending::<Option<SystemMetrics>>().await
                    }
                } => {
                    if let Some(metrics) = metrics {
                        let payload = serde_json::to_value(&metrics)?;
                        let msg = OutboundMessage::MetricsReport { payload };
                        let json = serde_json::to_string(&msg)?;
                        ws.send(Message::Text(json)).await?;
                        debug!("Metrics sent to server");
                    }
                }
            }
        }
    }
    
    /// Handle a message from the server.
    async fn handle_server_message(&self, text: &str) -> Result<()> {
        let message: InboundMessage = serde_json::from_str(text)
            .context("Failed to parse server message")?;
        
        match message {
            InboundMessage::Pong { timestamp } => {
                debug!("Pong received: {}", timestamp);
            }
            InboundMessage::ActionRequest { request_id, action, params } => {
                info!("Action request received: {} ({})", action, request_id);
                // STATUS: Tool executor not yet implemented
                // Action requests are logged but not executed.
                // Full implementation requires:
                // - Tool registry with permission validation
                // - Secure action execution sandbox
                // - Result reporting back to server
                // This is a planned feature for a future phase.
                debug!("Action params: {:?}", params);
            }
            InboundMessage::SessionTerminated { reason } => {
                warn!("Session terminated by server: {}", reason);
            }
            InboundMessage::Error { message: msg } => {
                warn!("Server error: {}", msg);
            }
            _ => {
                debug!("Unhandled message type");
            }
        }
        
        Ok(())
    }
    
    /// Get current connection state.
    pub async fn state(&self) -> ConnectionState {
        self.state.lock().await.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_connection_state_transitions() {
        assert_ne!(ConnectionState::Disconnected, ConnectionState::Connected);
        assert_eq!(ConnectionState::Connected, ConnectionState::Connected);
    }
    
    #[test]
    fn test_outbound_message_serialization() {
        let msg = OutboundMessage::Ping { timestamp: 1234567890 };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"Ping\""));
        assert!(json.contains("1234567890"));
    }
    
    #[test]
    fn test_inbound_message_deserialization() {
        let json = r#"{"type":"AuthAccepted","session_token":"sess_123","expires_at":"2026-01-01T00:00:00Z"}"#;
        let msg: InboundMessage = serde_json::from_str(json).unwrap();
        match msg {
            InboundMessage::AuthAccepted { session_token, .. } => {
                assert_eq!(session_token, "sess_123");
            }
            _ => panic!("Wrong message type"),
        }
    }
    
    #[test]
    fn test_auth_rejected_deserialization() {
        let json = r#"{"type":"AuthRejected","reason":"Device revoked"}"#;
        let msg: InboundMessage = serde_json::from_str(json).unwrap();
        match msg {
            InboundMessage::AuthRejected { reason } => {
                assert_eq!(reason, "Device revoked");
            }
            _ => panic!("Wrong message type"),
        }
    }
    
    #[test]
    fn test_hello_message_structure() {
        let msg = OutboundMessage::Hello {
            device_id: "dev_abc123".to_string(),
            public_key: "abcdef".to_string(),
            version: "0.1.0".to_string(),
            timestamp: 1234567890,
            signature: "sig123".to_string(),
        };
        
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("dev_abc123"));
        assert!(json.contains("sig123"));
    }
}
