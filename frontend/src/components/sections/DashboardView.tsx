import { useAppStore } from '../../store/appStore';
import ComplianceMetricsPanel from './ComplianceMetricsPanel';

export default function DashboardView() {
  const overallScore = useAppStore((s) => s.overallScore);

  // Quick compliance pills configuration
  const actionPills = [
    { label: 'Launch Scan', active: true },
    { label: 'Export statutory logs', active: false },
    { label: 'Registry Sync', active: false },
    { label: 'DPO Settings', active: false },
    { label: 'Active Gaps', active: false },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full min-h-0 overflow-y-auto no-scrollbar pb-6 text-t1">
      {/* ── LEFT COLUMN: SLEEK AUDIT HIGHLIGHTS & SVG CHARTS (8 cols) ── */}
      <div className="xl:col-span-8 flex flex-col gap-5 min-h-0">
        
        {/* Greetings Banner */}
        <div className="flex flex-col gap-1.5 px-1 select-none">
          <span className="mono text-[9px] uppercase tracking-widest text-violet font-black">
            System Dashboard
          </span>
          <h1 className="text-2xl font-black tracking-tight text-t1">
            Welcome back, Auditor
          </h1>
          <p className="text-xs text-t3 leading-relaxed">
            Let's secure and map your organization's statutory privacy posture today.
          </p>
        </div>

        {/* Quick Action Pills Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-1">
          {actionPills.map((pill, idx) => (
            <button
              key={idx}
              className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap select-none border border-transparent shadow-sm`}
              style={{
                background: pill.active ? 'var(--violet)' : 'var(--surface)',
                color: pill.active ? '#ffffff' : 'var(--t2)',
                cursor: 'none',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Key Health Status Card (Fitness Goal Progress Card style) */}
        <div className="bg-surface border border-border p-5 rounded-[2.5rem] flex flex-col gap-4 shadow-sm select-none relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-violet/10 blur-[50px] pointer-events-none" />
          
          <div className="flex items-center justify-between z-10">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-t3">
                Statutory Compliance Health
              </h3>
              <p className="text-lg font-black text-t1 mt-1">
                Your organization is {overallScore}% aligned
              </p>
            </div>
            
            {/* Coral-orange lightning badge matching fitness app circular symbols */}
            <div className="w-10 h-10 rounded-full bg-violet/15 flex items-center justify-center text-violet shrink-0 shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <div className="w-full h-2.5 bg-white/5 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${overallScore}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-t3 font-bold uppercase tracking-wider mt-0.5">
              <span>0% GAPS RESOLVED</span>
              <span>{overallScore}% SUCCESS RATE</span>
              <span>100% COMPLIANT</span>
            </div>
          </div>
        </div>

        {/* Three Custom SVG Analytics Grid (Fitness widgets style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Category Completion (Double Radial Arcs) */}
          <div className="bg-surface border border-border p-5 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] shadow-sm select-none">
            <div>
              <span className="mono text-[8px] uppercase tracking-widest text-violet font-bold">Arc Metric</span>
              <h4 className="text-xs font-bold text-t1 uppercase tracking-wider mt-1">Category Ratios</h4>
            </div>

            {/* Radial SVG charts */}
            <div className="flex items-center justify-center my-3 relative">
              <svg className="w-24 h-24 rotate-[-90deg]">
                {/* Notice Track */}
                <circle cx="48" cy="48" r="32" fill="none" stroke="var(--bg)" strokeWidth="6" />
                <circle
                  cx="48"
                  cy="48"
                  r="32"
                  fill="none"
                  stroke="var(--violet)"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - 0.75)}
                  strokeLinecap="round"
                />
                {/* Consent Track */}
                <circle cx="48" cy="48" r="22" fill="none" stroke="var(--bg)" strokeWidth="6" />
                <circle
                  cx="48"
                  cy="48"
                  r="22"
                  fill="none"
                  stroke="var(--cyan)"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - 0.55)}
                  strokeLinecap="round"
                />
              </svg>
              {/* Radial Center Tag */}
              <div className="absolute text-[9px] mono font-bold text-t3">75% / 55%</div>
            </div>

            <div className="flex justify-around text-[9px] text-t3 font-bold mt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet shrink-0" />
                <span>Notice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan shrink-0" />
                <span>Consent</span>
              </div>
            </div>
          </div>

          {/* Card 2: Scan Activity (Weekly Vertical Bar Chart) */}
          <div className="bg-surface border border-border p-5 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] shadow-sm select-none">
            <div>
              <span className="mono text-[8px] uppercase tracking-widest text-violet font-bold">Bar Analytics</span>
              <h4 className="text-xs font-bold text-t1 uppercase tracking-wider mt-1">Audit Scans</h4>
            </div>

            {/* Vertical bars chart */}
            <div className="flex items-end justify-between h-24 px-1 my-2">
              {[
                { label: 'M', val: 35 },
                { label: 'T', val: 55 },
                { label: 'W', val: 40 },
                { label: 'T', val: 80 },
                { label: 'F', val: 60 },
                { label: 'S', val: 95 },
                { label: 'S', val: 48 },
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-2.5 bg-white/5 dark:bg-white/5 rounded-full h-full relative overflow-hidden shrink-0">
                    <div
                      className="absolute bottom-0 left-0 w-full bg-violet rounded-full transition-all duration-700"
                      style={{ height: `${bar.val}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-t4 group-hover:text-t2 transition-colors mono">{bar.label}</span>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-t3 font-bold text-center mt-1">
              Weekly active scan logs
            </div>
          </div>

          {/* Card 3: Risk Incidents Trend (Squiggle Line Graph) */}
          <div className="bg-[#101118] border border-white/[0.02] p-5 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] shadow-md select-none text-white relative overflow-hidden">
            {/* Subtle background red glow */}
            <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-rose-500/10 blur-[35px] pointer-events-none" />

            <div>
              <span className="mono text-[8px] uppercase tracking-widest text-rose-400 font-bold">Anomaly Track</span>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mt-1">Risk Trend</h4>
            </div>

            {/* SVG line chart */}
            <div className="h-20 my-3">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area Gradient Path */}
                <path
                  d="M 0,35 Q 20,5 40,25 T 80,10 T 100,28 L 100,40 L 0,40 Z"
                  fill="url(#riskGrad)"
                />
                {/* Stroke Squiggle Line */}
                <path
                  d="M 0,35 Q 20,5 40,25 T 80,10 T 100,28"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold mt-1 z-10">
              <span>Risk score: 0.12</span>
              <span className="text-emerald-400 font-black">↓ 74.5%</span>
            </div>
          </div>

        </div>

      </div>

      {/* ── RIGHT COLUMN: COMPLIANCE METRICS PANEL (4 cols) ── */}
      <div className="xl:col-span-4 flex flex-col h-full min-h-0 overflow-hidden bg-surface border border-border rounded-[2.5rem] p-5 shadow-sm">
        <ComplianceMetricsPanel />
      </div>
    </div>
  );
}
