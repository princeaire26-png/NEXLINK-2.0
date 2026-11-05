//! Agent configuration module.
//!
//! Handles loading configuration from file and environment variables.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Agent configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Server URL to connect to
    pub server_url: String,
    
    /// Device name (hostname or user-defined)
    pub device_name: String,
    
    /// Path to store identity keys
    pub identity_path: PathBuf,
    
    /// Passphrase for encrypting the device identity at rest.
    /// Currently loaded from NEXLINK_IDENTITY_PASSPHRASE environment variable.
    /// For enhanced security, consider integrating with OS keychain (Windows Credential Manager,
    /// macOS Keychain, Linux Secret Service) in future versions.
    pub encryption_passphrase: String,
    
    /// Metrics collection interval in seconds
    pub metrics_interval_secs: u64,
    
    /// Enable remote desktop
    pub remote_desktop_enabled: bool,
    
    /// Enable terminal access
    pub terminal_enabled: bool,
    
    /// Enable file transfer
    pub file_transfer_enabled: bool,
    
    /// Enable AI tool execution
    pub ai_tools_enabled: bool,
    
    /// Maximum concurrent sessions
    pub max_sessions: usize,
    
    /// Log level
    pub log_level: String,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            server_url: "auto://_nexlink-server._tcp.local".to_string(),
            device_name: hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|_| "unknown-device".to_string()),
            identity_path: default_identity_path(),
            encryption_passphrase: std::env::var("NEXLINK_IDENTITY_PASSPHRASE")
                .unwrap_or_else(|_| "default-dev-passphrase-change-in-production".to_string()),
            metrics_interval_secs: 5,
            remote_desktop_enabled: true,
            terminal_enabled: true,
            file_transfer_enabled: true,
            ai_tools_enabled: true,
            max_sessions: 3,
            log_level: "info".to_string(),
        }
    }
}

impl AgentConfig {
    /// Load configuration from file, environment, or defaults.
    pub async fn load() -> Result<Self> {
        let config_path = Self::config_file_path();
        
        // Try loading from file
        if config_path.exists() {
            let contents = tokio::fs::read_to_string(&config_path)
                .await
                .with_context(|| format!("Failed to read config from {:?}", config_path))?;
            let config: AgentConfig = serde_json::from_str(&contents)
                .with_context(|| "Failed to parse agent configuration")?;
            return Ok(config);
        }
        
        // Try environment variables
        if let Ok(server_url) = std::env::var("NEXLINK_SERVER_URL") {
            let mut config = AgentConfig::default();
            config.server_url = server_url;
            if let Ok(name) = std::env::var("NEXLINK_DEVICE_NAME") {
                config.device_name = name;
            }
            return Ok(config);
        }
        
        // Return defaults
        Ok(AgentConfig::default())
    }
    
    /// Save configuration to file.
    pub async fn save(&self) -> Result<()> {
        let config_path = Self::config_file_path();
        if let Some(parent) = config_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        let contents = serde_json::to_string_pretty(self)?;
        tokio::fs::write(&config_path, contents).await?;
        Ok(())
    }
    
    fn config_file_path() -> PathBuf {
        let base = dirs_next::config_dir()
            .unwrap_or_else(|| PathBuf::from("."));
        base.join("nexlink").join("agent.json")
    }
}

fn default_identity_path() -> PathBuf {
    let base = dirs_next::data_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("nexlink").join("identity")
}

/// Simple hostname module (cross-platform).
mod hostname {
    use std::ffi::OsString;
    
    pub fn get() -> Result<OsString, std::io::Error> {
        #[cfg(unix)]
        {
            use std::process::Command;
            let output = Command::new("hostname").output()?;
            Ok(OsString::from(String::from_utf8_lossy(&output.stdout).trim().to_string()))
        }
        #[cfg(windows)]
        {
            std::env::var_os("COMPUTERNAME")
                .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "No hostname"))
        }
    }
}

/// Cross-platform directory helpers.
mod dirs_next {
    use std::path::PathBuf;
    
    pub fn config_dir() -> Option<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            std::env::var_os("APPDATA").map(PathBuf::from)
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::env::var_os("XDG_CONFIG_HOME")
                .map(PathBuf::from)
                .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))
        }
    }
    
    pub fn data_dir() -> Option<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::env::var_os("XDG_DATA_HOME")
                .map(PathBuf::from)
                .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
        }
    }
}
