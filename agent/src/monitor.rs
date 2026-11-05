//! System Monitor Module
//!
//! Collects system metrics: CPU, memory, disk, processes, services.
//! Cross-platform implementation using platform-specific APIs.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tracing::debug;

/// System metrics snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_percent: f32,
    pub cpu_cores: u32,
    pub memory_total_bytes: u64,
    pub memory_used_bytes: u64,
    pub memory_percent: f32,
    pub disk_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_percent: f32,
    pub uptime_seconds: u64,
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub architecture: String,
    pub timestamp: i64,
}

/// Process information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub status: String,
    pub user: String,
    pub start_time: i64,
}

/// Disk information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub mount_point: String,
    pub filesystem: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub percent_used: f32,
}

/// Network interface information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub name: String,
    pub ip_addresses: Vec<String>,
    pub mac_address: Option<String>,
    pub is_up: bool,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

/// System monitor that collects metrics.
pub struct SystemMonitor {
    previous_cpu: Option<CpuSnapshot>,
}

#[derive(Clone)]
struct CpuSnapshot {
    total: u64,
    idle: u64,
    timestamp: std::time::Instant,
}

impl SystemMonitor {
    /// Create a new system monitor.
    pub fn new() -> Self {
        Self {
            previous_cpu: None,
        }
    }
    
    /// Collect a full system metrics snapshot.
    pub async fn collect_metrics(&mut self) -> Result<SystemMetrics> {
        let cpu_percent = self.collect_cpu_percent().await?;
        let cpu_cores = self.collect_cpu_cores();
        let (mem_total, mem_used) = self.collect_memory().await?;
        let (disk_total, disk_used) = self.collect_primary_disk().await?;
        let uptime = self.collect_uptime().await?;
        let hostname = self.collect_hostname();
        let (os_name, os_version) = self.collect_os_info();
        let architecture = std::env::consts::ARCH.to_string();
        
        let memory_percent = if mem_total > 0 {
            (mem_used as f32 / mem_total as f32) * 100.0
        } else {
            0.0
        };
        
        let disk_percent = if disk_total > 0 {
            (disk_used as f32 / disk_total as f32) * 100.0
        } else {
            0.0
        };
        
        Ok(SystemMetrics {
            cpu_percent,
            cpu_cores,
            memory_total_bytes: mem_total,
            memory_used_bytes: mem_used,
            memory_percent,
            disk_total_bytes: disk_total,
            disk_used_bytes: disk_used,
            disk_percent,
            uptime_seconds: uptime,
            hostname,
            os_name,
            os_version,
            architecture,
            timestamp: chrono::Utc::now().timestamp(),
        })
    }
    
    /// Collect list of running processes.
    pub async fn list_processes(&self) -> Result<Vec<ProcessInfo>> {
        // Platform-specific implementation
        #[cfg(target_os = "linux")]
        {
            self.list_processes_linux().await
        }
        #[cfg(target_os = "windows")]
        {
            self.list_processes_windows().await
        }
        #[cfg(target_os = "macos")]
        {
            self.list_processes_macos().await
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok(vec![])
        }
    }
    
    /// Collect disk information for all mounted filesystems.
    pub async fn list_disks(&self) -> Result<Vec<DiskInfo>> {
        #[cfg(target_os = "linux")]
        {
            self.list_disks_linux().await
        }
        #[cfg(not(target_os = "linux"))]
        {
            // Simplified for other platforms
            let (total, used) = self.collect_primary_disk().await?;
            Ok(vec![DiskInfo {
                mount_point: "/".to_string(),
                filesystem: "unknown".to_string(),
                total_bytes: total,
                used_bytes: used,
                available_bytes: total.saturating_sub(used),
                percent_used: if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 },
            }])
        }
    }
    
    /// Collect network interface information.
    pub async fn list_network_interfaces(&self) -> Result<Vec<NetworkInfo>> {
        #[cfg(target_os = "linux")]
        {
            let contents = tokio::fs::read_to_string("/proc/net/dev").await?;
            let mut interfaces = Vec::new();
            
            for line in contents.lines().skip(2) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 17 {
                    let name = parts[0].trim_end_matches(':').to_string();
                    let bytes_received: u64 = parts[1].parse().unwrap_or(0);
                    let bytes_sent: u64 = parts[9].parse().unwrap_or(0);
                    
                    interfaces.push(NetworkInfo {
                        name,
                        ip_addresses: vec![],
                        mac_address: None,
                        is_up: true,
                        bytes_sent,
                        bytes_received,
                    });
                }
            }
            
            Ok(interfaces)
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::NetworkManagement::IpHelper::{GetAdaptersAddresses, GAA_FLAG_INCLUDE_PREFIX, IF_TYPE_ETHERNET_CSMACD, IP_ADAPTER_ADDRESSES_LH};
            use windows::Win32::Foundation::ERROR_BUFFER_OVERFLOW;
            use std::ptr;
            
            let mut interfaces = Vec::new();
            let mut buffer_length: u32 = 15000;
            let mut buffer: Vec<u8> = vec![0; buffer_length as usize];
            
            unsafe {
                let result = GetAdaptersAddresses(
                    0, // AF_UNSPEC
                    GAA_FLAG_INCLUDE_PREFIX,
                    None,
                    Some(ptr::null_mut()),
                    &mut buffer_length,
                );
                
                if result == ERROR_BUFFER_OVERFLOW.0 as u32 {
                    buffer = vec![0; buffer_length as usize];
                }
                
                let result = GetAdaptersAddresses(
                    0,
                    GAA_FLAG_INCLUDE_PREFIX,
                    None,
                    Some(buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH),
                    &mut buffer_length,
                );
                
                if result == 0 {
                    let mut adapter = buffer.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
                    while !adapter.is_null() {
                        let adapter_ref = &*adapter;
                        let name = adapter_ref.FriendlyName.to_string().unwrap_or_default();
                        
                        if !name.is_empty() {
                            interfaces.push(NetworkInfo {
                                name,
                                ip_addresses: vec![],
                                mac_address: None,
                                is_up: adapter_ref.OperStatus == 1,
                                bytes_sent: 0,
                                bytes_received: 0,
                            });
                        }
                        
                        adapter = adapter_ref.Next;
                    }
                }
            }
            
            Ok(interfaces)
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            let output = Command::new("netstat")
                .args(["-ibn"])
                .output()?;
            
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut interfaces = Vec::new();
            
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 11 {
                    let name = parts[0].to_string();
                    let bytes_received: u64 = parts[6].parse().unwrap_or(0);
                    let bytes_sent: u64 = parts[9].parse().unwrap_or(0);
                    
                    if !interfaces.iter().any(|i: &NetworkInfo| i.name == name) {
                        interfaces.push(NetworkInfo {
                            name,
                            ip_addresses: vec![],
                            mac_address: None,
                            is_up: true,
                            bytes_sent,
                            bytes_received,
                        });
                    }
                }
            }
            
            Ok(interfaces)
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok(vec![])
        }
    }
    
    // ---- CPU ----
    
    async fn collect_cpu_percent(&mut self) -> Result<f32> {
        #[cfg(target_os = "linux")]
        {
            let contents = tokio::fs::read_to_string("/proc/stat").await?;
            let first_line = contents.lines().next().unwrap_or("");
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            
            if parts.len() < 5 {
                return Ok(0.0);
            }
            
            let user: u64 = parts.get(1).unwrap_or(&"0").parse().unwrap_or(0);
            let nice: u64 = parts.get(2).unwrap_or(&"0").parse().unwrap_or(0);
            let system: u64 = parts.get(3).unwrap_or(&"0").parse().unwrap_or(0);
            let idle: u64 = parts.get(4).unwrap_or(&"0").parse().unwrap_or(0);
            
            let total = user + nice + system + idle;
            let current = CpuSnapshot {
                total,
                idle,
                timestamp: std::time::Instant::now(),
            };
            
            let percent = if let Some(prev) = &self.previous_cpu {
                let total_diff = current.total.saturating_sub(prev.total);
                let idle_diff = current.idle.saturating_sub(prev.idle);
                if total_diff > 0 {
                    ((total_diff - idle_diff) as f32 / total_diff as f32) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            };
            
            self.previous_cpu = Some(current);
            Ok(percent)
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::System::SystemInformation::GetSystemTimes;
            use windows::Win32::Foundation::FILETIME;
            
            let mut idle_time = FILETIME::default();
            let mut kernel_time = FILETIME::default();
            let mut user_time = FILETIME::default();
            
            unsafe {
                if GetSystemTimes(Some(&mut idle_time), Some(&mut kernel_time), Some(&mut user_time)).is_ok() {
                    let idle = ((idle_time.dwHighDateTime as u64) << 32) | (idle_time.dwLowDateTime as u64);
                    let kernel = ((kernel_time.dwHighDateTime as u64) << 32) | (kernel_time.dwLowDateTime as u64);
                    let user = ((user_time.dwHighDateTime as u64) << 32) | (user_time.dwLowDateTime as u64);
                    
                    let total = kernel + user;
                    let current = CpuSnapshot {
                        total,
                        idle,
                        timestamp: std::time::Instant::now(),
                    };
                    
                    let percent = if let Some(prev) = &self.previous_cpu {
                        let total_diff = current.total.saturating_sub(prev.total);
                        let idle_diff = current.idle.saturating_sub(prev.idle);
                        if total_diff > 0 {
                            ((total_diff - idle_diff) as f32 / total_diff as f32) * 100.0
                        } else {
                            0.0
                        }
                    } else {
                        0.0
                    };
                    
                    self.previous_cpu = Some(current);
                    return Ok(percent);
                }
            }
            Ok(0.0)
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            let output = Command::new("ps")
                .args(["-A", "-o", "%cpu"])
                .output()?;
            
            let stdout = String::from_utf8_lossy(&output.stdout);
            let total_cpu: f32 = stdout.lines()
                .skip(1)
                .filter_map(|line| line.trim().parse::<f32>().ok())
                .sum();
            
            // Normalize by number of cores
            let cores = self.collect_cpu_cores() as f32;
            Ok(if cores > 0.0 { total_cpu / cores } else { 0.0 })
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok(0.0)
        }
    }
    
    fn collect_cpu_cores(&self) -> u32 {
        std::thread::available_parallelism()
            .map(|n| n.get() as u32)
            .unwrap_or(1)
    }
    
    // ---- Memory ----
    
    async fn collect_memory(&self) -> Result<(u64, u64)> {
        #[cfg(target_os = "linux")]
        {
            let contents = tokio::fs::read_to_string("/proc/meminfo").await?;
            let mut total: u64 = 0;
            let mut available: u64 = 0;
            
            for line in contents.lines() {
                if line.starts_with("MemTotal:") {
                    total = parse_meminfo_value(line) * 1024; // kB to bytes
                } else if line.starts_with("MemAvailable:") {
                    available = parse_meminfo_value(line) * 1024;
                }
            }
            
            let used = total.saturating_sub(available);
            Ok((total, used))
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
            let mut mem_status = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                ..Default::default()
            };
            unsafe {
                if GlobalMemoryStatusEx(&mut mem_status).is_ok() {
                    let total = mem_status.ullTotalPhys as u64;
                    let available = mem_status.ullAvailPhys as u64;
                    let used = total.saturating_sub(available);
                    return Ok((total, used));
                }
            }
            Ok((0, 0))
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let output = Command::new("sysctl")
                .args(["-n", "hw.memsize"])
                .output()?;
            let total: u64 = String::from_utf8_lossy(&output.stdout)
                .trim()
                .parse()
                .unwrap_or(0);
            
            // Get VM stats for available memory
            let vm_output = Command::new("vm_stat")
                .output()?;
            let vm_str = String::from_utf8_lossy(&vm_output.stdout);
            let mut free_pages: u64 = 0;
            let mut page_size: u64 = 4096; // Default
            
            for line in vm_str.lines() {
                if line.contains("page size of") {
                    page_size = line.split_whitespace()
                        .nth(3)
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(4096);
                }
                if line.starts_with("Pages free:") {
                    free_pages = line.split_whitespace()
                        .nth(2)
                        .and_then(|s| s.trim_end_matches('.').parse().ok())
                        .unwrap_or(0);
                }
            }
            
            let available = free_pages * page_size;
            let used = total.saturating_sub(available);
            Ok((total, used))
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok((0, 0))
        }
    }
    
    // ---- Disk ----
    
    async fn collect_primary_disk(&self) -> Result<(u64, u64)> {
        #[cfg(target_os = "linux")]
        {
            // Use statvfs via /proc or command
            let output = tokio::process::Command::new("df")
                .args(["-B1", "/"])
                .output()
                .await?;
            
            let stdout = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = stdout.lines().collect();
            
            if lines.len() >= 2 {
                let parts: Vec<&str> = lines[1].split_whitespace().collect();
                if parts.len() >= 3 {
                    let total: u64 = parts[1].parse().unwrap_or(0);
                    let used: u64 = parts[2].parse().unwrap_or(0);
                    return Ok((total, used));
                }
            }
            
            Ok((0, 0))
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::{
                core::HSTRING,
                Win32::Storage::FileSystem::GetDiskFreeSpaceExW,
            };
            let mut free_bytes_available: u64 = 0;
            let mut total_bytes: u64 = 0;
            let mut total_free_bytes: u64 = 0;
            let path = HSTRING::from("C:\\");
            unsafe {
                if GetDiskFreeSpaceExW(
                    &path,
                    Some(&mut free_bytes_available),
                    Some(&mut total_bytes),
                    Some(&mut total_free_bytes),
                ).is_ok() {
                    let used = total_bytes.saturating_sub(total_free_bytes);
                    return Ok((total_bytes, used));
                }
            }
            Ok((0, 0))
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let output = Command::new("df")
                .args(["-k", "/"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = stdout.lines().collect();
            
            if lines.len() >= 2 {
                let parts: Vec<&str> = lines[1].split_whitespace().collect();
                if parts.len() >= 4 {
                    let total_kb: u64 = parts[1].parse().unwrap_or(0);
                    let used_kb: u64 = parts[2].parse().unwrap_or(0);
                    return Ok((total_kb * 1024, used_kb * 1024));
                }
            }
            Ok((0, 0))
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok((0, 0))
        }
    }
    
    #[cfg(target_os = "linux")]
    async fn list_disks_linux(&self) -> Result<Vec<DiskInfo>> {
        let output = tokio::process::Command::new("df")
            .args(["-B1", "-T"])
            .output()
            .await?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut disks = Vec::new();
        
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 7 {
                if let (Ok(total), Ok(used), Ok(avail)) = (
                    parts[2].parse::<u64>(),
                    parts[3].parse::<u64>(),
                    parts[4].parse::<u64>(),
                ) {
                    let percent = if total > 0 {
                        (used as f32 / total as f32) * 100.0
                    } else {
                        0.0
                    };
                    
                    disks.push(DiskInfo {
                        mount_point: parts[6].to_string(),
                        filesystem: parts[1].to_string(),
                        total_bytes: total,
                        used_bytes: used,
                        available_bytes: avail,
                        percent_used: percent,
                    });
                }
            }
        }
        
        Ok(disks)
    }
    
    // ---- Uptime ----
    
    async fn collect_uptime(&self) -> Result<u64> {
        #[cfg(target_os = "linux")]
        {
            let contents = tokio::fs::read_to_string("/proc/uptime").await?;
            let seconds_str = contents.split_whitespace().next().unwrap_or("0");
            let seconds: f64 = seconds_str.parse().unwrap_or(0.0);
            Ok(seconds as u64)
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::System::SystemInformation::GetTickCount64;
            let milliseconds = unsafe { GetTickCount64() };
            Ok(milliseconds / 1000)
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let output = Command::new("sysctl")
                .args(["-n", "kern.boottime"])
                .output()?;
            
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Format: "{ sec = 1234567890, usec = 123456 }"
            if let Some(sec_str) = stdout.split("sec = ").nth(1) {
                if let Some(sec_value) = sec_str.split(',').next() {
                    let boot_time: i64 = sec_value.trim().parse().unwrap_or(0);
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;
                    return Ok((now - boot_time) as u64);
                }
            }
            Ok(0)
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok(0)
        }
    }
    
    // ---- Hostname ----
    
    fn collect_hostname(&self) -> String {
        #[cfg(unix)]
        {
            std::process::Command::new("hostname")
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string())
        }
        #[cfg(windows)]
        {
            std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string())
        }
    }
    
    // ---- OS Info ----
    
    fn collect_os_info(&self) -> (String, String) {
        #[cfg(target_os = "linux")]
        {
            let name = std::fs::read_to_string("/etc/os-release")
                .ok()
                .and_then(|c| {
                    c.lines()
                        .find(|l| l.starts_with("PRETTY_NAME="))
                        .map(|l| l.trim_start_matches("PRETTY_NAME=\"").trim_end_matches('"').to_string())
                })
                .unwrap_or_else(|| "Linux".to_string());
            (name, String::new())
        }
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::System::SystemInformation::GetVersionExW;
            use windows::Win32::System::SystemInformation::OSVERSIONINFOW;
            
            let mut os_info = OSVERSIONINFOW {
                dwOSVersionInfoSize: std::mem::size_of::<OSVERSIONINFOW>() as u32,
                ..Default::default()
            };
            
            let version = unsafe {
                if GetVersionExW(&mut os_info).is_ok() {
                    format!("{}.{}.{}", 
                        os_info.dwMajorVersion, 
                        os_info.dwMinorVersion, 
                        os_info.dwBuildNumber)
                } else {
                    String::new()
                }
            };
            
            ("Windows".to_string(), version)
        }
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            let name = Command::new("sw_vers")
                .arg("-productName")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_else(|| "macOS".to_string());
            
            let version = Command::new("sw_vers")
                .arg("-productVersion")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_default();
            
            (name, version)
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            ("Unknown".to_string(), String::new())
        }
    }
    
    // ---- Process listing (platform-specific) ----
    
    #[cfg(target_os = "linux")]
    async fn list_processes_linux(&self) -> Result<Vec<ProcessInfo>> {
        let mut processes = Vec::new();
        let mut entries = tokio::fs::read_dir("/proc").await?;
        
        while let Some(entry) = entries.next_entry().await? {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            
            if let Ok(pid) = name_str.parse::<u32>() {
                // Read process comm
                let comm_path = entry.path().join("comm");
                if let Ok(comm) = tokio::fs::read_to_string(&comm_path).await {
                    processes.push(ProcessInfo {
                        pid,
                        name: comm.trim().to_string(),
                        cpu_percent: 0.0,
                        memory_bytes: 0,
                        status: "running".to_string(),
                        user: String::new(),
                        start_time: 0,
                    });
                }
            }
        }
        
        Ok(processes)
    }
    
    #[cfg(target_os = "windows")]
    async fn list_processes_windows(&self) -> Result<Vec<ProcessInfo>> {
        use windows::Win32::System::Threading::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, 
            CloseHandle, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
        };
        
        let mut processes = Vec::new();
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)?;
            let mut entry = PROCESSENTRY32W {
                dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
                ..Default::default()
            };
            
            if Process32FirstW(snapshot, &mut entry).is_ok() {
                loop {
                    let name = String::from_utf16_lossy(
                        &entry.szExeFile[..entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len())]
                    );
                    
                    processes.push(ProcessInfo {
                        pid: entry.th32ProcessID,
                        name,
                        cpu_percent: 0.0,
                        memory_bytes: 0,
                        status: "running".to_string(),
                        user: String::new(),
                        start_time: 0,
                    });
                    
                    if Process32NextW(snapshot, &mut entry).is_err() {
                        break;
                    }
                }
            }
            CloseHandle(snapshot).ok();
        }
        
        Ok(processes)
    }
    
    #[cfg(target_os = "macos")]
    async fn list_processes_macos(&self) -> Result<Vec<ProcessInfo>> {
        use std::process::Command;
        
        let output = Command::new("ps")
            .args(["-eo", "pid,comm"])
            .output()?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut processes = Vec::new();
        
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.trim().splitn(2, char::is_whitespace).collect();
            if parts.len() >= 2 {
                if let Ok(pid) = parts[0].parse::<u32>() {
                    processes.push(ProcessInfo {
                        pid,
                        name: parts[1].to_string(),
                        cpu_percent: 0.0,
                        memory_bytes: 0,
                        status: "running".to_string(),
                        user: String::new(),
                        start_time: 0,
                    });
                }
            }
        }
        
        Ok(processes)
    }
    
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    async fn list_processes_unsupported(&self) -> Result<Vec<ProcessInfo>> {
        Ok(vec![])
    }
}

#[cfg(target_os = "linux")]
fn parse_meminfo_value(line: &str) -> u64 {
    line.split_whitespace()
        .nth(1)
        .and_then(|v| v.parse().ok())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_monitor_creation() {
        let monitor = SystemMonitor::new();
        assert!(monitor.previous_cpu.is_none());
    }
    
    #[tokio::test]
    async fn test_collect_metrics() {
        let mut monitor = SystemMonitor::new();
        let metrics = monitor.collect_metrics().await.unwrap();
        
        assert!(metrics.cpu_cores >= 1);
        assert!(!metrics.hostname.is_empty());
        assert!(!metrics.architecture.is_empty());
        assert!(metrics.timestamp > 0);
    }
    
    #[tokio::test]
    async fn test_cpu_cores() {
        let monitor = SystemMonitor::new();
        let cores = monitor.collect_cpu_cores();
        assert!(cores >= 1);
    }
    
    #[test]
    fn test_metrics_serialization() {
        let metrics = SystemMetrics {
            cpu_percent: 25.5,
            cpu_cores: 4,
            memory_total_bytes: 16_000_000_000,
            memory_used_bytes: 8_000_000_000,
            memory_percent: 50.0,
            disk_total_bytes: 500_000_000_000,
            disk_used_bytes: 250_000_000_000,
            disk_percent: 50.0,
            uptime_seconds: 3600,
            hostname: "test-host".to_string(),
            os_name: "Linux".to_string(),
            os_version: "5.15".to_string(),
            architecture: "x86_64".to_string(),
            timestamp: 1234567890,
        };
        
        let json = serde_json::to_string(&metrics).unwrap();
        let deserialized: SystemMetrics = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.cpu_percent, 25.5);
        assert_eq!(deserialized.hostname, "test-host");
    }
}
