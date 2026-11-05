import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { devicesApi, Device } from '../../api/devices';

export default function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'pending'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await devicesApi.list();
      setDevices(response.devices);
    } catch (err: any) {
      setError(err.message || 'Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => {
    const matchesFilter = filter === 'all' || d.status === filter;
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                          d.osType.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    pending: 'bg-yellow-500',
    revoked: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    online: 'Online',
    offline: 'Offline',
    pending: 'Pending Approval',
    revoked: 'Revoked',
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Devices</h1>
          <p className="text-gray-500 mt-1">Manage your connected devices</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:from-cyan-400 hover:to-blue-500 transition-all">
          + Add Device
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-gray-500 mt-1">
            Ensure the NEXLINK server is running and VITE_API_URL is configured.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'online', 'offline', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors
                ${filter === f 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-200'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="text-gray-500 mt-4">Loading devices...</p>
        </div>
      )}

      {/* Device List */}
      {!loading && (
        <div className="space-y-2">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${statusColors[device.status]}`} />
                <div>
                  <p className="font-medium text-white">{device.name}</p>
                  <p className="text-sm text-gray-500">
                    {device.osType} {device.osVersion && `• ${device.osVersion}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${device.status === 'online' ? 'text-green-400' : 'text-gray-500'}`}>
                    {statusLabels[device.status]}
                  </p>
                  <p className="text-xs text-gray-600">
                    {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                  </p>
                </div>
              <button 
                onClick={() => navigate(`/dashboard/remote/${device.id}`)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:text-white hover:bg-gray-700 transition-colors"
              >
                Connect
              </button>              </div>
            </div>
          ))}

          {!loading && filteredDevices.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm">No devices found</p>
              <p className="text-xs text-gray-600 mt-1">
                Register your first device using the NEXLINK Agent
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && (
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filteredDevices.length} of {devices.length} devices</span>
          <span>
            {devices.filter(d => d.status === 'online').length} online •{' '}
            {devices.filter(d => d.status === 'offline').length} offline
          </span>
        </div>
      )}
    </div>
  );
}
