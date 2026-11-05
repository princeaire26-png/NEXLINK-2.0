import { useState } from 'react';
import { enrollmentApi, CreateEnrollmentResponse } from '../../api/enrollment';

export default function EnrollDevicePage() {
  const [step, setStep] = useState<'create' | 'token' | 'success'>('create');
  const [deviceName, setDeviceName] = useState('');
  const [enrollment, setEnrollment] = useState<CreateEnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await enrollmentApi.create(deviceName);
      setEnrollment(response);
      setStep('token');
    } catch (err: any) {
      setError(err.message || 'Failed to create enrollment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (enrollment) {
      try {
        await enrollmentApi.cancel(enrollment.enrollmentToken);
      } catch (err) {
        console.error('Failed to cancel enrollment', err);
      }
    }
    setStep('create');
    setEnrollment(null);
    setDeviceName('');
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Enroll New Device</h1>
      <p className="text-gray-500 mb-8">
        Generate an enrollment token to register a new device with NEXLINK.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {step === 'create' && (
        <form onSubmit={handleCreateEnrollment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="e.g., Office Desktop"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !deviceName.trim()}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Generate Enrollment Token'}
          </button>
        </form>
      )}

      {step === 'token' && enrollment && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Enrollment Token</h2>
            <p className="text-sm text-gray-400 mb-4">
              Use this token in the NEXLINK Agent on the device you want to enroll.
              The token expires in 10 minutes and can only be used once.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Device ID
                </label>
                <code className="block p-3 rounded-lg bg-gray-800 text-cyan-400 text-sm font-mono break-all">
                  {enrollment.deviceId}
                </code>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Enrollment Token
                </label>
                <code className="block p-3 rounded-lg bg-gray-800 text-cyan-400 text-sm font-mono break-all">
                  {enrollment.enrollmentToken}
                </code>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Expires At
                </label>
                <p className="text-sm text-gray-300">
                  {new Date(enrollment.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-gray-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Install the NEXLINK Agent on the target device</li>
              <li>Run the agent with the enrollment token</li>
              <li>The device will appear in your device list once enrolled</li>
              <li>Approve the device to enable remote access</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel Enrollment
            </button>
            <button
              onClick={() => setStep('success')}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              I've Enrolled the Device
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-xl font-semibold text-white mb-2">Device Enrolled</h2>
          <p className="text-gray-400 mb-6">
            The device has been enrolled and is pending approval.
          </p>
          <button
            onClick={() => {
              setStep('create');
              setEnrollment(null);
              setDeviceName('');
            }}
            className="px-6 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Enroll Another Device
          </button>
        </div>
      )}
    </div>
  );
}
