import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { monitoringApi } from '../../api/monitoring';

interface FrameData {
  width: number;
  height: number;
  data: string; // base64 encoded
  sequence: number;
  timestamp: number;
}

export default function RemoteViewerPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    fps: 0,
    latency: 0,
    framesReceived: 0,
    bytesReceived: 0,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (!deviceId) return;
    
    connectToDevice(deviceId);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [deviceId]);

  const connectToDevice = async (deviceId: string) => {
    try {
      setStatus('connecting');
      setError(null);
      
      // Verify device is online
      const deviceStatus = await monitoringApi.getStatus(deviceId);
      if (!deviceStatus.isOnline) {
        throw new Error('Device is offline');
      }
      
      // In a real implementation, this would:
      // 1. Create a remote session via API
      // 2. Establish WebSocket connection for frame streaming
      // 3. Start receiving frames
      
      // For MVP demo, we'll simulate the connection
      setStatus('connected');
      
      // Simulate frame reception for demo
      const demoInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Simulate receiving a frame
          frameCountRef.current++;
          
          const now = Date.now();
          if (now - lastFpsUpdateRef.current >= 1000) {
            setStats(prev => ({
              ...prev,
              fps: frameCountRef.current,
              framesReceived: frameCountRef.current,
            }));
            frameCountRef.current = 0;
            lastFpsUpdateRef.current = now;
          }
        }
      }, 33); // ~30 FPS
      
      return () => clearInterval(demoInterval);
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setStatus('error');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  };

  const renderFrame = (frame: FrameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Resize canvas to match frame
    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }
    
    // Decode base64 to image data
    const binaryStr = atob(frame.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Create ImageData from BGRA bytes
    const imageData = ctx.createImageData(frame.width, frame.height);
    for (let i = 0; i < bytes.length; i += 4) {
      // BGRA to RGBA conversion
      imageData.data[i] = bytes[i + 2];     // R
      imageData.data[i + 1] = bytes[i + 1]; // G
      imageData.data[i + 2] = bytes[i];     // B
      imageData.data[i + 3] = bytes[i + 3]; // A
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Remote Desktop Viewer</h1>
            <p className="text-gray-500 mt-1">Device: {deviceId}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard/devices')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              ← Back to Devices
            </button>
            {status === 'connected' && (
              <button
                onClick={disconnect}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-4 p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'connected' ? 'bg-green-500' :
                  status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <span className="text-sm font-medium text-gray-300">
                  {status === 'connected' ? 'Connected' :
                   status === 'connecting' ? 'Connecting...' :
                   status === 'error' ? 'Error' :
                   'Disconnected'}
                </span>
              </div>
              {status === 'connected' && (
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>FPS: {stats.fps}</span>
                  <span>Frames: {stats.framesReceived}</span>
                  <span>Latency: {stats.latency}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Remote Screen */}
        <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
          <canvas
            ref={canvasRef}
            className="w-full h-auto"
            style={{ 
              minHeight: '400px',
              backgroundColor: status === 'connected' ? '#000' : '#111'
            }}
          />
          
          {/* Overlay for disconnected state */}
          {status !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center">
                <p className="text-4xl mb-4">
                  {status === 'connecting' ? '🔄' :
                   status === 'error' ? '❌' :
                   '🖥️'}
                </p>
                <p className="text-lg text-gray-400">
                  {status === 'connecting' ? 'Establishing connection...' :
                   status === 'error' ? 'Connection failed' :
                   'Not connected'}
                </p>
                {status === 'disconnected' && (
                  <button
                    onClick={() => deviceId && connectToDevice(deviceId)}
                    className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 rounded-xl bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Session Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Status</p>
              <p className="text-gray-300">{status}</p>
            </div>
            <div>
              <p className="text-gray-500">Frames Received</p>
              <p className="text-gray-300">{stats.framesReceived}</p>
            </div>
            <div>
              <p className="text-gray-500">Frame Rate</p>
              <p className="text-gray-300">{stats.fps} FPS</p>
            </div>
            <div>
              <p className="text-gray-500">Data Received</p>
              <p className="text-gray-300">{(stats.bytesReceived / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        </div>

        {/* Phase 8 Notice */}
        <div className="mt-6 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-cyan-400">Phase 8: Remote Desktop MVP</p>
              <p className="text-xs text-gray-400 mt-1">
                Remote desktop streaming is implemented on the agent side with real screen capture (Windows GDI).
                The full end-to-end streaming pipeline requires the agent to be running and connected.
                This viewer demonstrates the client-side rendering architecture.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
