export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-32 lg:pb-24">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-sm text-cyan-400 font-medium">Rebuild 0.2 — Veyon-Informed Architecture</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            NEXLINK
          </span>
        </h1>
        
        {/* Tagline */}
        <p className="text-center text-xl sm:text-2xl mt-4 text-gray-400 font-light">
          Connect. Control. Understand. Automate.
        </p>

        {/* Description */}
        <p className="text-center text-lg mt-6 text-gray-500 max-w-3xl mx-auto leading-relaxed">
          An AI-native remote computing and device management platform. 
          Security-first. Self-hostable. Provider-independent.
        </p>

        {/* Flow */}
        <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
          {['CONNECT', 'UNDERSTAND', 'CONTROL', 'AUTOMATE'].map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-sm font-medium text-gray-300">
                {step}
              </div>
              {i < 3 && (
                <svg className="w-4 h-4 text-gray-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
          {[
            { label: 'Architecture Sections', value: '22' },
            { label: 'Development Phases', value: '17' },
            { label: 'Core Components', value: '3' },
            { label: 'AI Tools (MVP)', value: '5' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-gray-800/40 border border-gray-700/50">
              <div className="text-2xl font-bold text-cyan-400">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12">
          <div className="animate-bounce text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
