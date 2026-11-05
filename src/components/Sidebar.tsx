import { Section } from '../data/sections';

interface SidebarProps {
  sections: Section[];
  activeSection: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ sections, activeSection, isOpen, onClose }: SidebarProps) {
  const handleClick = (id: string) => {
    const element = document.querySelector(`[data-section="${id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300 overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                NEXLINK
              </h1>
              <p className="text-xs text-gray-500">Technical Foundation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
            Documentation
          </p>
          <ul className="space-y-0.5">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => handleClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2
                    ${activeSection === section.id
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                >
                  <span className="text-xs opacity-60 font-mono w-5">{section.number}</span>
                  <span className="truncate">{section.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status */}
        <div className="p-4 mx-4 mb-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-xs font-medium text-yellow-400">Rebuild 0.2</span>
          </div>
          <p className="text-xs text-gray-400">Modular Control Plane</p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '18%' }}></div>
          </div>
        </div>
      </aside>
    </>
  );
}
