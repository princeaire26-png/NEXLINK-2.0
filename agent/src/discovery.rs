//! mDNS/DNS-SD discovery for `_nexlink-server._tcp.local`.
//! Discovery is a hint only; the WebSocket Ed25519 challenge-response remains mandatory.
use anyhow::{anyhow, Context, Result};
use mdns_sd::{ServiceDaemon, ServiceEvent};
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};

const SERVICE_TYPE: &str = "_nexlink-server._tcp.local.";

pub fn discover_server(timeout: Duration) -> Result<String> {
    let daemon = ServiceDaemon::new().context("could not start mDNS service daemon")?;
    let receiver = daemon.browse(SERVICE_TYPE).context("could not browse NEXLINK DNS-SD service")?;
    let deadline = Instant::now() + timeout;
    let mut last_error = None;
    while Instant::now() < deadline {
        match receiver.recv_timeout(Duration::from_millis(500)) {
            Ok(ServiceEvent::ServiceResolved(info)) => {
                let port = info.get_port();
                let path = info.get_property_val_str("path").unwrap_or("/ws");
                let secure = info.get_property_val_str("protocol").unwrap_or("ws") == "wss";
                for address in info.get_addresses() {
                    if address.is_loopback() || address.is_unspecified() { continue; }
                    let host = match address {
                        std::net::IpAddr::V6(v6) => format!("[{}]", v6),
                        std::net::IpAddr::V4(v4) => v4.to_string(),
                    };
                    let url = format!("{}://{}:{}{}", if secure { "wss" } else { "ws" }, host, port, path);
                    info!(%url, "Discovered NEXLINK server via mDNS");
                    let _ = daemon.stop_browse(SERVICE_TYPE);
                    let _ = daemon.shutdown();
                    return Ok(url);
                }
            }
            Ok(_) => {}
            Err(error) => { last_error = Some(error); debug!(%error, "mDNS discovery wait"); }
        }
    }
    let _ = daemon.stop_browse(SERVICE_TYPE);
    let _ = daemon.shutdown();
    warn!("No NEXLINK server found through LAN discovery");
    Err(anyhow!("NEXLINK server not found on the local network{}", last_error.map(|e| format!(": {e}")).unwrap_or_default()))
}
