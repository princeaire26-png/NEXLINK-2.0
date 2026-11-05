import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BrandFooter from '../shared/BrandFooter';
import { Bot, Cable, ChevronRight, Command, FileClock, LayoutDashboard, LogOut, Plus, Radio, Settings2, ShieldCheck, Sparkles, Laptop, MonitorCog, AppWindow } from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/manager', label: 'Server Manager', icon: MonitorCog },
    { path: '/client', label: 'Endpoint Client', icon: AppWindow },
    { path: '/dashboard/devices', label: 'Endpoints', icon: Laptop },
    { path: '/dashboard/enroll', label: 'Pair endpoint', icon: Plus },
    { path: '/dashboard/features', label: 'Capabilities', icon: ShieldCheck },
    { path: '/dashboard/sessions', label: 'Sessions', icon: Cable },
    { path: '/dashboard/ai', label: 'AI operations', icon: Bot },
    { path: '/dashboard/automations', label: 'Automations', icon: Sparkles },
    { path: '/dashboard/audit', label: 'Audit trail', icon: FileClock },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings2 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="nx-shell min-h-screen text-gray-100 flex">
      {/* Sidebar */}
      <aside className="nx-sidebar w-64 shrink-0 flex flex-col">
        {/* Logo */}
        <div className="border-b border-white/[.07] p-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/25 to-blue-600/25 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.12)]">
              <Command size={20}/>
            </div>
            <span><span className="block text-[15px] font-bold tracking-[.2em] text-white">NEXLINK</span><span className="mt-0.5 block text-[9px] uppercase tracking-[.18em] text-slate-500">Command platform</span></span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="px-5 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.22em] text-slate-600">Workspace</div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`));
            const Icon = item.icon;
            return <Link key={item.path} to={item.path} className={`nx-nav-link ${active ? 'active' : ''}`}>
              <Icon size={16}/><span className="flex-1">{item.label}</span>{active && <ChevronRight size={14} className="opacity-70"/>}
            </Link>;
          })}
        </nav>
        <div className="mx-4 mb-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[.045] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300"><Radio size={13}/> Network status</div><p className="mt-2 text-xs text-slate-400">Local discovery enabled</p><p className="mt-1 text-[10px] text-slate-600">Authentication always required</p></div>

        {/* User section */}
        <div className="border-t border-white/[.07] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/15 bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-cyan-200">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="flex-1 text-center text-xs px-2 py-1.5 rounded bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              Docs
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="nx-main flex min-w-0 min-h-screen flex-1 flex-col overflow-auto">
        <div className="flex-1">
          <Outlet />
        </div>
        <BrandFooter />
      </main>
    </div>
  );
}
