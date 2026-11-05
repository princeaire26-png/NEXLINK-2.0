//! NEXLINK Agent
//!
//! The core agent that runs on managed devices.
//! Provides secure remote access, monitoring, and AI tool execution.

mod identity;
mod transport;
mod monitor;
mod protocol;
mod config;
mod remote;
mod discovery;

use anyhow::Result;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    // Parse CLI arguments
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() > 1 {
        match args[1].as_str() {
            "--version" => {
                println!("NEXLINK Agent v{}", env!("CARGO_PKG_VERSION"));
                return Ok(());
            }
            "--help" | "-h" => {
                print_help();
                return Ok(());
            }
            "--status" => {
                println!("Agent status:");
                println!("  Mode: Standalone (not running as service)");
                println!("  Connection: Not connected");
                println!("  Note: Service mode and connection status tracking not yet implemented");
                return Ok(());
            }
            "--config" => {
                let config = config::AgentConfig::load().await?;
                println!("Configuration:");
                println!("  Server URL: {}", config.server_url);
                println!("  Device Name: {}", config.device_name);
                println!("  Identity Path: {:?}", config.identity_path);
                println!("  Metrics Interval: {}s", config.metrics_interval_secs);
                println!("  Remote Desktop: {}", config.remote_desktop_enabled);
                println!("  Terminal: {}", config.terminal_enabled);
                println!("  File Transfer: {}", config.file_transfer_enabled);
                println!("  AI Tools: {}", config.ai_tools_enabled);
                return Ok(());
            }
            "--enroll" => {
                if args.len() < 3 {
                    eprintln!("Usage: nexlink-agent --enroll <token>");
                    std::process::exit(1);
                }
                let token = &args[2];
                println!("Enrollment token received: {}...", &token[..8.min(token.len())]);
                println!("STATUS: CLI enrollment flow not yet implemented");
                println!("The enrollment process requires:");
                println!("  1. Generating device identity (Ed25519 keypair)");
                println!("  2. Sending identity to server with enrollment token");
                println!("  3. Receiving server confirmation");
                println!("  4. Storing approved device credentials");
                println!("");
                println!("Current workaround: Use the web dashboard to manage device enrollment");
                return Ok(());
            }
            _ => {
                eprintln!("Unknown argument: {}", args[1]);
                print_help();
                std::process::exit(1);
            }
        }
    }
    
    // Initialize structured logging
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    info!("NEXLINK Agent starting");
    info!("Version: {}", env!("CARGO_PKG_VERSION"));

    // Load configuration
    let mut config = config::AgentConfig::load().await?;
    info!("Configuration loaded for device: {}", config.device_name);
    if config.server_url.is_empty() || config.server_url.starts_with("auto://") {
        info!("No fixed server configured; searching local network with DNS-SD");
        config.server_url = discovery::discover_server(std::time::Duration::from_secs(12))?;
    }

    // Initialize or load device identity
    let identity = identity::DeviceIdentity::initialize(&config).await?;
    info!("Device identity established: {}", identity.device_id());

    // Start transport layer
    let mut transport = transport::Transport::new(config.server_url.clone(), identity.clone());
    
    // Create metrics channel
    let (metrics_tx, metrics_rx) = tokio::sync::mpsc::channel(10);
    transport.set_metrics_receiver(metrics_rx);
    
    info!("Connecting to NEXLINK server at {}", config.server_url);
    
    // Start monitoring loop (sends metrics through channel)
    let monitor_handle = tokio::spawn(async move {
        let mut monitor = monitor::SystemMonitor::new();
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(
            config.metrics_interval_secs
        ));
        
        loop {
            interval.tick().await;
            match monitor.collect_metrics().await {
                Ok(metrics) => {
                    if metrics_tx.send(metrics).await.is_err() {
                        error!("Metrics channel closed");
                        break;
                    }
                }
                Err(e) => {
                    error!("Metrics collection failed: {}", e);
                }
            }
        }
    });

    // Run transport (handles connection, authentication, reconnection)
    match transport.run().await {
        Ok(_) => {
            info!("Transport session ended cleanly");
        }
        Err(e) => {
            error!("Transport error: {}", e);
        }
    }

    monitor_handle.abort();
    info!("NEXLINK Agent shutting down");
    Ok(())
}

fn print_help() {
    println!("NEXLINK Agent v{}", env!("CARGO_PKG_VERSION"));
    println!();
    println!("USAGE:");
    println!("    nexlink-agent [OPTIONS]");
    println!();
    println!("OPTIONS:");
    println!("    --version        Show version information");
    println!("    --help, -h       Show this help message");
    println!("    --status         Show agent status");
    println!("    --config         Show current configuration");
    println!("    --enroll <token> Enroll device with enrollment token");
    println!();
    println!("ENVIRONMENT VARIABLES:");
    println!("    NEXLINK_SERVER_URL              Server WebSocket URL (ws:// or wss://)");
    println!("    NEXLINK_DEVICE_NAME             Device name (defaults to hostname)");
    println!("    NEXLINK_IDENTITY_PASSPHRASE     Passphrase for identity encryption");
    println!();
    println!("Run without arguments to start the agent in normal mode.");
}
