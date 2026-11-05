//! Frame Encoder
//!
//! Encodes captured frames for efficient transport.
//! Supports multiple encoding strategies for different bandwidth/quality tradeoffs.

use anyhow::Result;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use std::io::Write;

use super::capture::{CapturedFrame, PixelFormat};

/// Encoded frame ready for transport.
#[derive(Debug, Clone)]
pub struct EncodedFrame {
    pub width: u32,
    pub height: u32,
    pub pixel_format: PixelFormat,
    pub encoding: FrameEncoding,
    pub data: Vec<u8>,
    pub timestamp: i64,
    pub is_keyframe: bool,
    pub sequence: u64,
    pub original_size: usize,
}

/// Frame encoding type.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FrameEncoding {
    Raw,
    Zlib,
    Jpeg,
}

/// Frame encoder configuration.
#[derive(Debug, Clone)]
pub struct EncoderConfig {
    pub encoding: FrameEncoding,
    pub quality: u8, // 0-100 for JPEG
    pub target_fps: u32,
}

impl Default for EncoderConfig {
    fn default() -> Self {
        Self {
            encoding: FrameEncoding::Zlib,
            quality: 80,
            target_fps: 30,
        }
    }
}

/// Frame encoder.
pub struct FrameEncoder {
    config: EncoderConfig,
    sequence: u64,
}

impl FrameEncoder {
    /// Create a new frame encoder.
    pub fn new(config: EncoderConfig) -> Self {
        Self {
            config,
            sequence: 0,
        }
    }
    
    /// Encode a captured frame.
    pub fn encode(&mut self, frame: &CapturedFrame) -> Result<EncodedFrame> {
        let (data, encoding) = match self.config.encoding {
            FrameEncoding::Raw => {
                (frame.data.clone(), FrameEncoding::Raw)
            }
            FrameEncoding::Zlib => {
                let compressed = self.compress_zlib(&frame.data)?;
                (compressed, FrameEncoding::Zlib)
            }
            FrameEncoding::Jpeg => {
                // JPEG encoding would require image crate
                // For MVP, fall back to zlib
                let compressed = self.compress_zlib(&frame.data)?;
                (compressed, FrameEncoding::Zlib)
            }
        };
        
        let original_size = frame.data.len();
        self.sequence += 1;
        
        Ok(EncodedFrame {
            width: frame.width,
            height: frame.height,
            pixel_format: frame.pixel_format,
            encoding,
            data,
            timestamp: frame.timestamp,
            is_keyframe: frame.is_keyframe,
            sequence: self.sequence,
            original_size,
        })
    }
    
    /// Compress data using zlib.
    fn compress_zlib(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut encoder = ZlibEncoder::new(Vec::new(), Compression::fast());
        encoder.write_all(data)?;
        Ok(encoder.finish()?)
    }
    
    /// Get compression ratio for the last frame.
    pub fn compression_ratio(&self, encoded: &EncodedFrame) -> f32 {
        if encoded.original_size == 0 {
            0.0
        } else {
            encoded.data.len() as f32 / encoded.original_size as f32
        }
    }
    
    /// Get current sequence number.
    pub fn sequence(&self) -> u64 {
        self.sequence
    }
    
    /// Reset sequence counter.
    pub fn reset_sequence(&mut self) {
        self.sequence = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encoder_creation() {
        let encoder = FrameEncoder::new(EncoderConfig::default());
        assert_eq!(encoder.sequence(), 0);
    }
    
    #[test]
    fn test_encode_raw() {
        let mut encoder = FrameEncoder::new(EncoderConfig {
            encoding: FrameEncoding::Raw,
            ..Default::default()
        });
        
        let frame = CapturedFrame {
            width: 2,
            height: 2,
            pixel_format: PixelFormat::Bgra,
            data: vec![0u8; 16], // 2x2 BGRA
            timestamp: 12345,
            is_keyframe: true,
        };
        
        let encoded = encoder.encode(&frame).unwrap();
        assert_eq!(encoded.width, 2);
        assert_eq!(encoded.height, 2);
        assert_eq!(encoded.encoding, FrameEncoding::Raw);
        assert_eq!(encoded.data.len(), 16);
        assert_eq!(encoded.sequence, 1);
    }
    
    #[test]
    fn test_encode_zlib() {
        let mut encoder = FrameEncoder::new(EncoderConfig {
            encoding: FrameEncoding::Zlib,
            ..Default::default()
        });
        
        // Create a frame with repetitive data (compresses well)
        let frame = CapturedFrame {
            width: 10,
            height: 10,
            pixel_format: PixelFormat::Bgra,
            data: vec![128u8; 400], // 10x10 BGRA, all same value
            timestamp: 12345,
            is_keyframe: true,
        };
        
        let encoded = encoder.encode(&frame).unwrap();
        assert_eq!(encoded.encoding, FrameEncoding::Zlib);
        // Compressed size should be smaller than original
        assert!(encoded.data.len() < encoded.original_size);
    }
    
    #[test]
    fn test_sequence_increment() {
        let mut encoder = FrameEncoder::new(EncoderConfig::default());
        
        let frame = CapturedFrame {
            width: 1,
            height: 1,
            pixel_format: PixelFormat::Bgra,
            data: vec![0u8; 4],
            timestamp: 0,
            is_keyframe: true,
        };
        
        encoder.encode(&frame).unwrap();
        assert_eq!(encoder.sequence(), 1);
        
        encoder.encode(&frame).unwrap();
        assert_eq!(encoder.sequence(), 2);
    }
}
