import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HeroSection from './components/HeroSection';
import SectionContent from './components/SectionContent';
import DashboardLayout from './components/dashboard/DashboardLayout';
import LoginPage from './components/dashboard/LoginPage';
import DevicesPage from './components/dashboard/DevicesPage';
import OverviewPage from './components/dashboard/OverviewPage';
import EnrollDevicePage from './components/dashboard/EnrollDevicePage';
import RemoteViewerPage from './components/dashboard/RemoteViewerPage';
import FeatureCenterPage from './components/dashboard/FeatureCenterPage';
import { sections } from './data/sections';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import BrandFooter from './components/shared/BrandFooter';
import ClientApp from './apps/ClientApp';
import ServerManager from './apps/ServerManager';

function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = document.querySelectorAll('[data-section]');
      sectionElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom > 150) {
          setActiveSection(el.getAttribute('data-section') || '');
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          NEXLINK
        </span>
      </div>

      <Sidebar sections={sections} activeSection={activeSection} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-72 pt-16 lg:pt-0">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-white/5 bg-slate-950/70 px-5 py-3 text-xs">
          <span className="mr-auto text-[10px] uppercase tracking-[.18em] text-slate-500">NEXLINK interfaces</span>
          <a href="/dashboard" className="nx-button-secondary">Admin Dashboard</a>
          <a href="/manager" className="nx-button-secondary">Server Manager</a>
          <a href="/client" className="nx-button-secondary">Endpoint Client</a>
        </div>
        <HeroSection />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          {sections.map((section) => (
            <SectionContent key={section.id} section={section} />
          ))}
        </div>
        <BrandFooter />
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DocsPage />} />
      <Route path="/client" element={<ClientApp />} />
      <Route path="/manager" element={<ServerManager />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<OverviewPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="enroll" element={<EnrollDevicePage />} />
        <Route path="remote/:deviceId" element={<RemoteViewerPage />} />
        <Route path="features" element={<FeatureCenterPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
