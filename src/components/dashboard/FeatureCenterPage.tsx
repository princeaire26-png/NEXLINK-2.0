import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

type Feature = {
  key: string; name: string; description: string;
  category: string; status: 'implemented' | 'partial' | 'planned';
  veyonReference: string; nexlinkAdvantage: string; actions: string[];
};
type CatalogResponse = { features: Feature[]; actionCount: number; executionMode: string };
type PendingOperation = { operation: { id: string; action: string; reason: string; riskLevel: string; createdAt: string; requesterId: string }; deviceName: string };
type PendingResponse = { operations: PendingOperation[] };

const categoryLabels: Record<string, string> = {
  remote_access: 'Remote access', monitoring: 'Monitoring', collaboration: 'Collaboration',
  administration: 'Administration', intelligence: 'Intelligence', deployment: 'Deployment',
};
const statusStyles = {
  implemented: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  partial: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  planned: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
};

export default function FeatureCenterPage() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [actionCount, setActionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [pending, setPending] = useState<PendingOperation[]>([]);
  const [queueMessage, setQueueMessage] = useState('');

  const loadPending = async () => {
    if (user?.role !== 'owner' && user?.role !== 'admin') return;
    try {
      const result = await api.get<PendingResponse>('/api/v1/features/operations/pending');
      setPending(result.operations);
    } catch {
      // The capability catalogue remains available even if this account cannot view approvals.
    }
  };

  useEffect(() => {
    api.get<CatalogResponse>('/api/v1/features/catalog')
      .then((result) => { setFeatures(result.features); setActionCount(result.actionCount); })
      .catch((err: Error) => setError(err.message || 'Could not load the feature registry.'))
      .finally(() => setLoading(false));
    void loadPending();
  }, [user?.role]);

  const decideOperation = async (id: string, decision: 'approve' | 'reject') => {
    setQueueMessage('');
    try {
      await api.post(`/api/v1/features/operations/${id}/${decision}`, {});
      setQueueMessage(`Request ${decision}d. It has not been executed on the endpoint.`);
      await loadPending();
    } catch (err) {
      setQueueMessage(err instanceof Error ? err.message : 'Could not update the request.');
    }
  };

  const filtered = useMemo(() => filter === 'all' ? features : features.filter((feature) => feature.category === filter), [features, filter]);
  const counts = useMemo(() => ({
    implemented: features.filter((f) => f.status === 'implemented').length,
    partial: features.filter((f) => f.status === 'partial').length,
    planned: features.filter((f) => f.status === 'planned').length,
  }), [features]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-400 mb-2">Modular capability system</p>
          <h1 className="text-3xl font-bold text-white">NEXLINK Feature Center</h1>
          <p className="text-gray-400 mt-2 max-w-3xl">A Veyon-inspired modular feature architecture, extended for secure multi-site operations, policy-governed actions and AI-assisted management.</p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 min-w-52">
          <p className="text-xs text-gray-400">Registered action types</p>
          <p className="text-2xl font-semibold text-white">{actionCount || '—'}</p>
          <p className="text-xs text-cyan-300">Allow-listed · not unrestricted commands</p>
        </div>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        {([
          ['Implemented', counts.implemented, 'text-emerald-300'],
          ['Partial', counts.partial, 'text-amber-300'],
          ['Planned', counts.planned, 'text-slate-300'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-sm text-gray-500">{label}</p><p className={`text-2xl font-semibold mt-1 ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {(user?.role === 'owner' || user?.role === 'admin') && (
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-7">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div><h2 className="text-lg font-semibold text-white">Approval queue</h2><p className="text-xs text-gray-500 mt-1">High-impact requests require a second authorised person.</p></div>
            <span className="rounded-full bg-amber-400/10 text-amber-300 px-3 py-1 text-xs">{pending.length} pending</span>
          </div>
          {queueMessage && <p className="text-xs text-cyan-300 mb-3">{queueMessage}</p>}
          {pending.length === 0 ? <p className="text-sm text-gray-500 py-3">No requests are awaiting approval.</p> : (
            <div className="space-y-3">
              {pending.map(({ operation, deviceName }) => (
                <div key={operation.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg bg-gray-950 border border-gray-800 p-3">
                  <div><p className="text-sm font-medium text-white">{operation.action.replace(/_/g, ' ')} · {deviceName}</p><p className="text-xs text-gray-400 mt-1">{operation.reason}</p><p className="text-[11px] text-amber-300 mt-1">{operation.riskLevel.toUpperCase()} risk · requested {new Date(operation.createdAt).toLocaleString()}</p></div>
                  {operation.requesterId === user?.id ? <span className="text-xs text-gray-500">Awaiting a different approver</span> : <div className="flex gap-2 shrink-0"><button onClick={() => void decideOperation(operation.id, 'approve')} className="px-3 py-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">Approve</button><button onClick={() => void decideOperation(operation.id, 'reject')} className="px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20">Reject</button></div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg text-sm border ${filter === 'all' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'border-gray-800 text-gray-400 hover:bg-gray-900'}`}>All capabilities</button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 rounded-lg text-sm border ${filter === key ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'border-gray-800 text-gray-400 hover:bg-gray-900'}`}>{label}</button>
        ))}
      </div>

      {loading ? <div className="py-16 text-center text-gray-500">Loading capability registry…</div> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((feature) => (
            <article key={feature.key} className="rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs uppercase tracking-wider text-gray-500">{categoryLabels[feature.category] || feature.category}</p><h2 className="text-lg font-semibold text-white mt-1">{feature.name}</h2></div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs capitalize ${statusStyles[feature.status]}`}>{feature.status}</span>
              </div>
              <p className="text-sm text-gray-400 mt-3 leading-6">{feature.description}</p>
              <div className="mt-4 rounded-lg bg-gray-950/70 border border-gray-800 p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Veyon concept</p>
                <p className="text-sm text-gray-300 mt-1">{feature.veyonReference}</p>
                <p className="text-[11px] uppercase tracking-wider text-cyan-400 mt-3">NEXLINK extension</p>
                <p className="text-sm text-gray-300 mt-1">{feature.nexlinkAdvantage}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {feature.actions.map((action) => <code key={action} className="text-[11px] px-2 py-1 rounded bg-gray-800 text-gray-400">{action}</code>)}
              </div>
              {feature.status !== 'implemented' && <p className="text-xs text-gray-500 mt-4">{feature.status === 'partial' ? 'Core foundation exists; complete endpoint and agent integration still required.' : 'Registered in the architecture; implementation is not yet available.'}</p>}
            </article>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3"><span className="text-amber-300 text-lg">⚠</span><div>
          <h3 className="font-semibold text-amber-200">Execution safety and implementation status</h3>
          <p className="text-sm text-gray-400 mt-1 leading-6">This registry is live server data. It does not imply every listed feature can already execute on an endpoint. Remote desktop and monitoring remain partial in this codebase; the other capabilities are planned. The new operation-governance API records allow-listed requests and approvals, but a signed agent-side executor and end-to-end dispatch are still required before endpoint actions can run.</p>
        </div></div>
      </div>
    </div>
  );
}
