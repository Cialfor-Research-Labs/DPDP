import { useState } from 'react';
import AuditChatPanel from './components/sections/AuditChatPanel';
import DashboardView from './components/sections/DashboardView';
import ReportsView from './components/sections/ReportsView';
import ComplianceScoreView from './components/sections/ComplianceScoreView';
import CursorFX from './components/cursor/CursorFX';
import { useAppStore } from './store/appStore';
import { motion, AnimatePresence } from 'framer-motion';


type Tab = 'dashboard' | 'audit-engine' | 'reports' | 'score';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  // Tab configurations with labels and icons
  const tabs = [
    {
      id: 'dashboard' as Tab,
      label: 'Dashboard',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      id: 'audit-engine' as Tab,
      label: 'Audit Engine',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <path d="M2 12h20" />
        </svg>
      ),
    },
    {
      id: 'reports' as Tab,
      label: 'Recent Reports',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: 'score' as Tab,
      label: 'Compliance Score',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative w-full h-screen flex overflow-hidden text-t1 transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      {/* Custom cursor */}
      <CursorFX />

      {/* ── LEFT COLUMN SIDEBAR (Dribbble App Sidebar Style) ── */}
      <aside className={`h-full flex flex-col p-5 shrink-0 border-r border-white/5 bg-[#14151f] shadow-lg relative z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Brand/Logo Header with Collapse Toggle */}
        <div className={`flex items-center justify-between mb-8 px-2 ${isSidebarCollapsed ? 'flex-col gap-4' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-violet/20 border border-violet/30 flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2" fill="var(--violet-light)" />
                <circle cx="6" cy="6" r="5" stroke="var(--violet-light)" strokeOpacity="0.4" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="font-display font-black text-xs tracking-wider uppercase text-white select-none">
                DPDP AI
              </span>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all select-none hover:scale-105 shrink-0"
            style={{ cursor: 'none' }}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Dynamic Navigation Items */}
        <nav className="flex-1 flex flex-col gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[11px] font-bold tracking-wider uppercase transition-all select-none ${isSidebarCollapsed ? 'justify-center' : ''}`}
                style={{
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  cursor: 'none',
                }}
                title={isSidebarCollapsed ? tab.label : undefined}
              >
                {/* Visual circle icon wrapper matching Dribbble selected style */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                    isActive
                      ? 'bg-white text-violet shadow-[0_4px_12px_rgba(255,255,255,0.15)] border-white'
                      : 'border-white/10 text-white/50 bg-white/[0.01] hover:border-white/20'
                  }`}
                >
                  {tab.icon}
                </div>
                {!isSidebarCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom CTA (Dribbble Assistant Card) */}
        {!isSidebarCollapsed && (
          <div className="mb-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-3xl flex flex-col gap-2.5 shrink-0">
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">
              Need Assistance?
            </h4>
            <p className="text-[9px] text-white/50 leading-relaxed">
              Our DPDPA compliance auditor is ready to map your privacy structures.
            </p>
            <button
              onClick={() => setActiveTab('audit-engine')}
              className="w-full py-1.5 rounded-xl bg-white text-[#14151f] hover:bg-white/95 text-[9px] font-black uppercase tracking-wider transition-all text-center"
              style={{ cursor: 'none' }}
            >
              Launch Assistant
            </button>
          </div>
        )}

        {/* Theme Toggle Button (Moon/Sun icons with customized hover glows) */}
        <div className="pt-3 border-t border-white/5 flex justify-center shrink-0">
          <button
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 bg-white/[0.02] ${
              theme === 'light'
                ? 'hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:border-amber-500/40 text-amber-500 border-white/10 hover:bg-amber-500/5'
                : 'hover:shadow-[0_0_15px_rgba(156,163,175,0.45)] hover:border-gray-500/30 text-gray-300 border-white/10 hover:bg-gray-500/5'
            }`}
            style={{ cursor: 'none' }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              /* Sun icon for light mode (glows in gold/yellow) */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Crescent moon icon for dark mode (glows in gray) */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </aside>

      {/* ── RIGHT COLUMN MAIN WORKSPACE ── */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Top Header Panel */}
        <header className="shrink-0 h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#05050c]/10 backdrop-blur-md z-20">
          <div>
            <h2 className="text-xs font-bold text-t1 uppercase tracking-wider select-none">
              {tabs.find((t) => t.id === activeTab)?.label} Mode
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Icon */}
            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-t3 hover:text-t1 transition-colors" style={{ cursor: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            {/* Notification bell */}
            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-t3 hover:text-t1 transition-colors" style={{ cursor: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {/* User Profile Avatar */}
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
              alt="User"
              className="w-7 h-7 rounded-full border border-white/10 object-cover"
            />
          </div>
        </header>

        {/* Dynamic View Loader */}
        <main className="flex-1 p-6 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full h-full overflow-hidden"
            >
              {activeTab === 'dashboard' && <DashboardView />}
              
              {activeTab === 'audit-engine' && (
                <div className="w-full h-full overflow-hidden">
                  <AuditChatPanel />
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="w-full h-full max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-5 shadow-sm overflow-hidden">
                  <ReportsView />
                </div>
              )}

              {activeTab === 'score' && (
                <div className="w-full h-full max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-5 shadow-sm overflow-hidden">
                  <ComplianceScoreView />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
