//! Protocol message type definitions.

use serde::{Deserialize, Serialize};

/// Check if a message type is known.
pub fn is_known_message_type(msg_type: &str) -> bool {
    matches!(msg_type,
        // Authentication & enrollment
        "hello" | "hello_ack" |
        "auth_challenge" | "auth_proof" | "auth_accepted" | "auth_rejected" |
        "enroll_request" | "enroll_challenge" | "enroll_proof" | "enroll_accepted" | "enroll_rejected" |
        
        // Connection management
        "ping" | "pong" |
        "status_update" |
        "disconnect" |
        
        // Monitoring
        "metrics_report" |
        "metrics_request" |
        
        // Sessions
        "session_start" | "session_start_ack" | "session_end" |
        
        // Remote desktop
        "desktop_frame" | "desktop_config" |
        "session_create" | "session_accept" | "session_reject" | "session_terminate" |
        "screen_info" | "screen_keyframe" | "screen_frame" | "screen_frame_ack" |
        
        // Input
        "input_event" |
        
        // Clipboard
        "clipboard_sync" |
        
        // File transfer
        "file_transfer_request" | "file_transfer_data" | "file_transfer_complete" | "file_transfer_cancel" |
        
        // Terminal
        "terminal_command" | "terminal_output" | "terminal_exit" |
        
        // AI tools
        "ai_tool_request" | "ai_tool_response" |
        
        // Errors
        "error"
    )
}

/// Device status values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceStatus {
    Online,
    Offline,
    Pending,
    Revoked,
}

/// Session types.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionType {
    RemoteDesktop,
    Terminal,
    FileTransfer,
    AiAssistant,
}

/// Risk levels for AI tools.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Input event types.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "input_type")]
pub enum InputEvent {
    #[serde(rename = "mouse_move")]
    MouseMove { x: i32, y: i32 },
    #[serde(rename = "mouse_button")]
    MouseButton { button: MouseButton, pressed: bool },
    #[serde(rename = "mouse_scroll")]
    MouseScroll { delta_x: i32, delta_y: i32 },
    #[serde(rename = "key_press")]
    KeyPress { key: String, modifiers: Vec<String> },
    #[serde(rename = "key_release")]
    KeyRelease { key: String, modifiers: Vec<String> },
}

/// Mouse buttons.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

/// Hello message sent by agent on connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelloMessage {
    pub device_id: String,
    pub public_key: String,
    pub agent_version: String,
    pub os_type: String,
    pub os_version: String,
    pub hostname: String,
    pub timestamp: i64,
    pub signature: String,
}

/// Authentication challenge from server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthChallenge {
    pub challenge_id: String,
    pub challenge_data: String,
    pub expires_at: i64,
}

/// Authentication proof from agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthProof {
    pub challenge_id: String,
    pub signature: String,
    pub timestamp: i64,
}

/// Metrics report from agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsReport {
    pub cpu_percent: f32,
    pub cpu_cores: u32,
    pub memory_total_bytes: u64,
    pub memory_used_bytes: u64,
    pub memory_percent: f32,
    pub disk_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_percent: f32,
    pub uptime_seconds: u64,
    pub timestamp: i64,
}

/// Terminal command request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalCommand {
    pub command_id: String,
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: Option<String>,
    pub timeout_seconds: u32,
    pub session_id: String,
}

/// Terminal output.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutput {
    pub command_id: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub completed: bool,
}

/// File transfer request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTransferRequest {
    pub transfer_id: String,
    pub direction: TransferDirection,
    pub path: String,
    pub size_bytes: Option<u64>,
    pub session_id: String,
}

/// Transfer direction.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransferDirection {
    Upload,
    Download,
}

/// AI tool request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiToolRequest {
    pub request_id: String,
    pub tool_name: String,
    pub parameters: serde_json::Value,
    pub session_id: String,
}

/// AI tool response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiToolResponse {
    pub request_id: String,
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

// ============================================================================
// Remote Desktop Protocol Messages (Phase 8)
// ============================================================================

/// Remote session state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionState {
    Disconnected,
    Connecting,
    Authenticating,
    Active,
    Paused,
    Terminating,
    Terminated,
}

/// Screen information sent at session start.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenInfo {
    pub width: u32,
    pub height: u32,
    pub pixel_format: PixelFormat,
    pub monitors: Vec<MonitorInfo>,
}

/// Monitor information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub name: String,
}

/// Pixel format for frame data.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PixelFormat {
    Bgra,
    Rgba,
   Rgb,
}

/// Frame encoding type.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FrameEncoding {
    /// Raw uncompressed pixels
    Raw,
    /// zlib-compressed pixels
    Zlib,
    /// JPEG-compressed frame
    Jpeg,
}

/// A screen frame from the agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenFrame {
    pub session_id: String,
    pub sequence: u64,
    pub timestamp: i64,
    pub is_keyframe: bool,
    pub encoding: FrameEncoding,
    pub width: u32,
    pub height: u32,
    pub pixel_format: PixelFormat,
    /// Changed region (x, y, width, height) or full frame if None
    pub dirty_rect: Option<DirtyRect>,
    /// Frame data (encoded pixels)
    #[serde(with = "base64_bytes")]
    pub data: Vec<u8>,
}

/// Dirty rectangle for partial updates.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirtyRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// Session create request from controller.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionCreate {
    pub device_id: String,
    pub session_type: SessionType,
    pub controller_id: String,
}

/// Session acceptance from server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionAccept {
    pub session_id: String,
    pub device_id: String,
    pub screen_info: ScreenInfo,
}

/// Session rejection from server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionReject {
    pub reason: String,
    pub device_id: Option<String>,
}

/// Session termination.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTerminate {
    pub session_id: String,
    pub reason: String,
}

/// Frame acknowledgment from controller.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenFrameAck {
    pub session_id: String,
    pub sequence: u64,
}

/// Remote session metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetrics {
    pub session_id: String,
    pub duration_seconds: u64,
    pub frames_sent: u64,
    pub frames_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub average_fps: f32,
    pub dropped_frames: u64,
    pub estimated_latency_ms: f32,
}

/// Base64 serialization for byte vectors.
mod base64_bytes {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    
    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where S: Serializer {
        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        encoded.serialize(serializer)
    }
    
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where D: Deserializer<'de> {
        use base64::Engine;
        let s = String::deserialize(deserializer)?;
        base64::engine::general_purpose::STANDARD.decode(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_known_message_types() {
        assert!(is_known_message_type("hello"));
        assert!(is_known_message_type("ping"));
        assert!(is_known_message_type("ai_tool_request"));
        assert!(is_known_message_type("desktop_frame"));
        assert!(is_known_message_type("terminal_command"));
        assert!(!is_known_message_type("invalid"));
        assert!(!is_known_message_type(""));
    }
    
    #[test]
    fn test_input_event_serialization() {
        let event = InputEvent::MouseMove { x: 100, y: 200 };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("mouse_move"));
        
        let decoded: InputEvent = serde_json::from_str(&json).unwrap();
        match decoded {
            InputEvent::MouseMove { x, y } => {
                assert_eq!(x, 100);
                assert_eq!(y, 200);
            }
            _ => panic!("Wrong variant"),
        }
    }
    
    #[test]
    fn test_metrics_report_serialization() {
        let report = MetricsReport {
            cpu_percent: 25.5,
            cpu_cores: 4,
            memory_total_bytes: 16_000_000_000,
            memory_used_bytes: 8_000_000_000,
            memory_percent: 50.0,
            disk_total_bytes: 500_000_000_000,
            disk_used_bytes: 250_000_000_000,
            disk_percent: 50.0,
            uptime_seconds: 3600,
            timestamp: 1234567890,
        };
        
        let json = serde_json::to_string(&report).unwrap();
        let decoded: MetricsReport = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.cpu_percent, 25.5);
        assert_eq!(decoded.cpu_cores, 4);
    }
    
    #[test]
    fn test_device_status_serialization() {
        let status = DeviceStatus::Online;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"online\"");
    }
    
    #[test]
    fn test_risk_level_ordering() {
        let levels = vec![
            RiskLevel::Low,
            RiskLevel::Medium,
            RiskLevel::High,
            RiskLevel::Critical,
        ];
        
        for level in levels {
            let json = serde_json::to_string(&level).unwrap();
            let decoded: RiskLevel = serde_json::from_str(&json).unwrap();
            assert_eq!(level, decoded);
        }
    }
}
