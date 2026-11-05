import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Bot, Cable, CheckCircle2, AlertCircle, Clock3, Command, Cpu, HardDrive, Laptop, Network, Plus, Radio, RefreshCw, ShieldCheck, Signal, Sparkles, Wifi } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { monitoringApi, MonitoringSummary } from '../../api/monitoring';

function MetricCard({ label, value, icon: Icon, tone, hint }: { label: string; value: string | number; icon: typeof Laptop; tone: string; hint: string }) {
  return <div className="nx-panel nx-metric group">
    <div className="flex items-start justify-between"><div><p className="nx-muted text-xs font-semibold uppercase tracking-[.16em]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p></div><div className={`nx-icon ${tone}`}><Icon size={19}/></div></div>
    <p className="mt-4 text-xs text-slate-500">{hint}</p>
  </div>;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadStats = useCallback(async () => {
    try { setError(null); setStats(await monitoringApi.getSummary()); setLastUpdated(new Date()); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unable to load live infrastructure data'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadStats(); const id = window.setInterval(() => void loadStats(), 30000); return () => window.clearInterval(id); }, [loadStats]);

  const cards = [
    { label: 'Registered endpoints', value: stats?.totalDevices ?? '—', icon: Laptop, tone: 'blue', hint: 'Devices enrolled with this server' },
    { label: 'Online now', value: stats?.onlineDevices ?? '—', icon: Signal, tone: 'green', hint: 'Authenticated active connections' },
    { label: 'Offline', value: stats?.offlineDevices ?? '—', icon: HardDrive, tone: 'slate', hint: 'Currently unreachable endpoints' },
    { label: 'Awaiting approval', value: stats?.pendingDevices ?? '—', icon: ShieldCheck, tone: 'violet', hint: 'Pairing requests requiring review' },
  ];

  return <div className="nx-dashboard min-h-full p-5 sm:p-7 lg:p-9">
    <div className="nx-orb nx-orb-one"/><div className="nx-orb nx-orb-two"/>
    <div className="relative z-10 mx-auto max-w-[1500px]">
      <header className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300"><span className="nx-live-dot"/> NEXLINK command center</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Good to see you, <span className="nx-gradient-text">{user?.name?.split(' ')[0] || 'Administrator'}.</span></h1>
          <p className="mt-2 text-sm text-slate-400">Your infrastructure at a glance. Monitor, connect and control with confidence.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="nx-chip"><span className="nx-live-dot"/> Server telemetry {error ? 'degraded' : 'connected'}</div>
          <button onClick={() => void loadStats()} className="nx-button-secondary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh</button>
          <Link to="/dashboard/enroll" className="nx-button-primary"><Plus size={16}/> Add endpoint</Link>
        </div>
      </header>

      {error && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-4 text-sm text-amber-200"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div><p className="font-semibold">Live data unavailable</p><p className="mt-1 text-amber-100/60">{error}. Displayed values are not simulated; reconnect to the server to restore telemetry.</p></div></div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">{cards.map(card => <MetricCard key={card.label} {...card}/>)}</section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className="nx-panel nx-hero-panel overflow-hidden p-6 sm:p-7">
          <div className="relative z-10 flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-xl"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-cyan-300"><Network size={15}/> Network discovery</div>
              <h2 className="text-2xl font-semibold text-white">Every endpoint.<br/><span className="nx-gradient-text">One connected view.</span></h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">NEXLINK uses local DNS-SD discovery to help agents locate your server on the same LAN. Device identity and approval are still verified cryptographically.</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="nx-chip"><Radio size={13}/> _nexlink-server._tcp.local</span><span className="nx-chip"><ShieldCheck size={13}/> Ed25519 authentication</span></div>
            </div>
            <div className="nx-network-visual" aria-label="Decorative network visualization"><div className="nx-network-ring ring-a"/><div className="nx-network-ring ring-b"/><div className="nx-network-core"><Network size={29}/></div><span className="nx-node node-a"><Laptop size={14}/></span><span className="nx-node node-b"><Cpu size={14}/></span><span className="nx-node node-c"><HardDrive size={14}/></span><span className="nx-node node-d"><Wifi size={14}/></span></div>
          </div>
          <div className="relative z-10 mt-7 border-t border-white/[.07] pt-4 text-xs text-slate-500">Discovery is a connection hint only. No endpoint is trusted until server-side enrollment and authentication succeed.</div>
        </div>

        <div className="nx-panel p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">System status</p><h2 className="mt-1 text-lg font-semibold text-white">Server overview</h2></div><span className="nx-icon green"><Activity size={18}/></span></div>
          <div className="mt-6 space-y-4">
            {[{name:'API & dashboard',state:error?'Check connection':'Monitoring',icon:Command},{name:'Device coordination',state:'Authenticated channel',icon:Cable},{name:'LAN discovery',state:'DNS-SD service',icon:Radio},{name:'Security model',state:'Approval required',icon:ShieldCheck}].map((item,i)=><div key={item.name} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[.06] bg-white/[.035] text-cyan-300"><item.icon size={16}/></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.state}</p></div>{i===0&&error?<AlertCircle size={16} className="text-amber-400"/>:<CheckCircle2 size={16} className="text-emerald-400"/>}</div>)}
          </div><div className="mt-6 flex items-center justify-between border-t border-white/[.07] pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Clock3 size={13}/> Last sync</span><span>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for telemetry'}</span></div>
        </div>
      </section>

      <section className="mt-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Workspace</p><h2 className="mt-1 text-lg font-semibold text-white">Control center</h2></div><span className="text-xs text-slate-500">Choose an operation</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{to:'/dashboard/devices',title:'Manage endpoints',desc:'Inspect status, identity and health',icon:Laptop},{to:'/dashboard/enroll',title:'Pair a device',desc:'Create a secure one-time enrollment',icon:Wifi},{to:'/dashboard/features',title:'Capabilities & policies',desc:'Review available controlled actions',icon:ShieldCheck},{to:'/dashboard/features',title:'AI operations',desc:'Explore policy-governed tools',icon:Bot}].map(item=><Link key={item.title} to={item.to} className="nx-action-card group"><span className="nx-action-icon"><item.icon size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-100">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.desc}</span></span><ArrowUpRight size={16} className="shrink-0 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300"/></Link>)}
        </div>
      </section>
      <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-slate-600"><Sparkles size={12}/> Connect. Control. Automate.</div>
    </div>
  </div>;
}
