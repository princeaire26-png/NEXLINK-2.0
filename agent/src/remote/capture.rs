//! Screen Capture Abstraction
//!
//! Platform-specific screen capture implementations.
//! Uses native APIs for efficient frame capture.

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Captured frame data.
#[derive(Debug, Clone)]
pub struct CapturedFrame {
    pub width: u32,
    pub height: u32,
    pub pixel_format: PixelFormat,
    pub data: Vec<u8>,
    pub timestamp: i64,
    pub is_keyframe: bool,
}

/// Pixel format.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PixelFormat {
    Bgra,
    Rgba,
    Rgb,
}

/// Monitor information.
#[derive(Debug, Clone)]
pub struct MonitorInfo {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub name: String,
}

/// Screen capture trait.
pub trait ScreenCapture: Send + Sync {
    /// Initialize the capture system.
    fn init(&mut self) -> Result<()>;
    
    /// Capture a single frame.
    fn capture_frame(&mut self) -> Result<CapturedFrame>;
    
    /// Get monitor information.
    fn get_monitors(&self) -> Result<Vec<MonitorInfo>>;
    
    /// Get the primary monitor dimensions.
    fn get_primary_dimensions(&self) -> Result<(u32, u32)>;
    
    /// Clean up resources.
    fn cleanup(&mut self) -> Result<()>;
}

/// Create a platform-specific screen capture instance.
pub fn create_screen_capture() -> Result<Box<dyn ScreenCapture>> {
    #[cfg(target_os = "windows")]
    {
        Ok(Box::new(WindowsScreenCapture::new()))
    }
    
    #[cfg(target_os = "linux")]
    {
        Ok(Box::new(LinuxScreenCapture::new()))
    }
    
    #[cfg(target_os = "macos")]
    {
        Ok(Box::new(MacOSScreenCapture::new()))
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        anyhow::bail!("Screen capture not supported on this platform")
    }
}

// ============================================================================
// Windows Implementation (DXGI Desktop Duplication)
// ============================================================================

#[cfg(target_os = "windows")]
mod windows {
    use super::*;
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, IDXGIAdapter1, IDXGIOutput, IDXGIOutput1,
        DXGI_OUTPUT_DESC,
    };
    use windows::Win32::Graphics::Direct3D11::{
        D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, D3D11_CREATE_DEVICE_FLAG,
        D3D11_SDK_VERSION, D3D_FEATURE_LEVEL, D3D_FEATURE_LEVEL_11_0,
    };
    use windows::Win32::Graphics::Dxgi::{
        IDXGIDevice, DXGI_FORMAT_B8G8R8A8_UNORM,
    };
    use windows::core::Interface;
    use windows::Win32::Foundation::{HWND, RECT, HMONITOR};
    use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MONITORINFOEXW};
    
    pub struct WindowsScreenCapture {
        // DXGI resources would be stored here
        // For MVP, we'll use a simplified GDI-based approach
        initialized: bool,
    }
    
    impl WindowsScreenCapture {
        pub fn new() -> Self {
            Self { initialized: false }
        }
    }
    
    impl ScreenCapture for WindowsScreenCapture {
        fn init(&mut self) -> Result<()> {
            // For MVP: Use GDI BitBlt for screen capture
            // Production would use DXGI Desktop Duplication for better performance
            self.initialized = true;
            Ok(())
        }
        
        fn capture_frame(&mut self) -> Result<CapturedFrame> {
            if !self.initialized {
                anyhow::bail!("Screen capture not initialized");
            }
            
            // Simplified GDI capture for MVP
            // In production, use DXGI Output Duplication
            use windows::Win32::Graphics::Gdi::{
                GetDC, ReleaseDC, CreateCompatibleDC, CreateCompatibleBitmap,
                SelectObject, BitBlt, DeleteObject, DeleteDC, GetDeviceCaps,
                SRCCOPY, HORZRES, VERTRES,
            };
            use windows::Win32::Foundation::HWND;
            
            unsafe {
                let hdc_screen = GetDC(HWND(std::ptr::null_mut()));
                if hdc_screen.is_invalid() {
                    anyhow::bail!("Failed to get screen DC");
                }
                
                let width = GetDeviceCaps(hdc_screen, HORZRES) as u32;
                let height = GetDeviceCaps(hdc_screen, VERTRES) as u32;
                
                let hdc_mem = CreateCompatibleDC(hdc_screen);
                let hbm = CreateCompatibleBitmap(hdc_screen, width as i32, height as i32);
                let old_obj = SelectObject(hdc_mem, hbm);
                
                BitBlt(hdc_mem, 0, 0, width as i32, height as i32, hdc_screen, 0, 0, SRCCOPY);
                
                // Extract pixel data
                use windows::Win32::Graphics::Gdi::{GetDIBits, BITMAPINFOHEADER, BITMAPINFO, BI_RGB};
                
                let mut bi = BITMAPINFOHEADER::default();
                bi.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
                bi.biWidth = width as i32;
                bi.biHeight = -(height as i32); // Top-down
                bi.biPlanes = 1;
                bi.biBitCount = 32;
                bi.biCompression = BI_RGB;
                
                let mut data = vec![0u8; (width * height * 4) as usize];
                
                GetDIBits(
                    hdc_mem,
                    hbm,
                    0,
                    height,
                    Some(data.as_mut_ptr() as *mut _),
                    &BITMAPINFO { bmiHeader: bi, bmiColors: [] } as *const _ as *mut _,
                    0,
                );
                
                SelectObject(hdc_mem, old_obj);
                DeleteObject(hbm);
                DeleteDC(hdc_mem);
                ReleaseDC(HWND(std::ptr::null_mut()), hdc_screen);
                
                Ok(CapturedFrame {
                    width,
                    height,
                    pixel_format: PixelFormat::Bgra,
                    data,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                    is_keyframe: true,
                })
            }
        }
        
        fn get_monitors(&self) -> Result<Vec<MonitorInfo>> {
            // Simplified: return primary monitor info
            use windows::Win32::Graphics::Gdi::{GetSystemMetrics, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN};
            
            unsafe {
                let x = GetSystemMetrics(SM_XVIRTUALSCREEN);
                let y = GetSystemMetrics(SM_YVIRTUALSCREEN);
                let width = GetSystemMetrics(SM_CXVIRTUALSCREEN) as u32;
                let height = GetSystemMetrics(SM_CYVIRTUALSCREEN) as u32;
                
                Ok(vec![MonitorInfo {
                    id: 0,
                    x,
                    y,
                    width,
                    height,
                    is_primary: true,
                    name: "Primary Monitor".to_string(),
                }])
            }
        }
        
        fn get_primary_dimensions(&self) -> Result<(u32, u32)> {
            use windows::Win32::Graphics::Gdi::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
            
            unsafe {
                let width = GetSystemMetrics(SM_CXSCREEN) as u32;
                let height = GetSystemMetrics(SM_CYSCREEN) as u32;
                Ok((width, height))
            }
        }
        
        fn cleanup(&mut self) -> Result<()> {
            self.initialized = false;
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
use windows::WindowsScreenCapture;

// ============================================================================
// Linux Implementation (X11/XCB)
// ============================================================================

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    
    pub struct LinuxScreenCapture {
        initialized: bool,
    }
    
    impl LinuxScreenCapture {
        pub fn new() -> Self {
            Self { initialized: false }
        }
    }
    
    impl ScreenCapture for LinuxScreenCapture {
        fn init(&mut self) -> Result<()> {
            // X11 capture would be implemented here
            self.initialized = true;
            Ok(())
        }
        
        fn capture_frame(&mut self) -> Result<CapturedFrame> {
            anyhow::bail!("Linux screen capture not yet implemented")
        }
        
        fn get_monitors(&self) -> Result<Vec<MonitorInfo>> {
            Ok(vec![])
        }
        
        fn get_primary_dimensions(&self) -> Result<(u32, u32)> {
            Ok((1920, 1080))
        }
        
        fn cleanup(&mut self) -> Result<()> {
            Ok(())
        }
    }
}

#[cfg(target_os = "linux")]
use linux::LinuxScreenCapture;

// ============================================================================
// macOS Implementation (CoreGraphics)
// ============================================================================

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    
    pub struct MacOSScreenCapture {
        initialized: bool,
    }
    
    impl MacOSScreenCapture {
        pub fn new() -> Self {
            Self { initialized: false }
        }
    }
    
    impl ScreenCapture for MacOSScreenCapture {
        fn init(&mut self) -> Result<()> {
            self.initialized = true;
            Ok(())
        }
        
        fn capture_frame(&mut self) -> Result<CapturedFrame> {
            anyhow::bail!("macOS screen capture not yet implemented")
        }
        
        fn get_monitors(&self) -> Result<Vec<MonitorInfo>> {
            Ok(vec![])
        }
        
        fn get_primary_dimensions(&self) -> Result<(u32, u32)> {
            Ok((1920, 1080))
        }
        
        fn cleanup(&mut self) -> Result<()> {
            Ok(())
        }
    }
}

#[cfg(target_os = "macos")]
use macos::MacOSScreenCapture;
