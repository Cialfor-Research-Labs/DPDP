import { useAppStore } from '../../store/appStore';

export default function ComplianceScoreView() {
  const recentReports = useAppStore((s) => s.recentReports);
  const sections = useAppStore((s) => s.sections);

  // Compute stats dynamically
  const totalReports = recentReports.length;
  const sumScores = recentReports.reduce((acc, r) => acc + r.score, 0);
  const avgScore = totalReports > 0 ? Math.round(sumScores / totalReports) : 0;

  const maxScore = totalReports > 0 ? Math.max(...recentReports.map((r) => r.score)) : 0;
  const minScore = totalReports > 0 ? Math.min(...recentReports.map((r) => r.score)) : 0;

  // Pie chart variables
  const radius = 45;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - avgScore / 100);

  // Compliance sections counts
  const compliantCount = sections.filter((s) => s.status === 'compliant').length;
  const gapCount = sections.filter((s) => s.status === 'gap' || s.status === 'critical').length;
  const pendingCount = sections.filter((s) => s.status === 'pending').length;

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 gap-4 text-t1">
      {/* Header */}
      <div>
        <span className="mono text-[9px] uppercase tracking-widest text-violet font-bold">
          Compliance Intelligence
        </span>
        <h2 className="text-xl font-bold text-t1 mt-1">
          Historical Audit Analytics
        </h2>
        <p className="text-xs text-t3 leading-relaxed mt-1">
          Statistical aggregate analysis of DPDPA 2023 compliance assessments logged across all reports.
        </p>
      </div>

      {/* Main Grid: Pie Chart Left + Stats Right */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white/[0.01] dark:bg-white/[0.01] border border-border p-5 rounded-3xl">
          {/* Custom SVG Pie/Donut Chart */}
          <div className="flex flex-col items-center justify-center py-2 shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-36 h-36 rotate-[-90deg]">
                {/* Background Full Circle */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={strokeWidth}
                />
                {/* Colored Progress Donut Segment */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="none"
                  stroke={avgScore > 70 ? '#10b981' : avgScore > 40 ? '#f59e0b' : '#ff5a36'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Centered average score tag */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-t1">{avgScore}%</span>
                <span className="mono text-[8px] text-t4 tracking-wider">AVERAGE</span>
              </div>
            </div>
            <p className="text-[10px] text-t4 mt-3 mono uppercase tracking-widest text-center">
              Avg DPDPA Compliance Gauge
            </p>
          </div>

          {/* Aggregate metrics details */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-t1 uppercase tracking-wider">
              Assessment Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 dark:bg-white/5 border border-border p-3 rounded-xl">
                <span className="mono text-[8px] text-t4 uppercase">Total Reports</span>
                <span className="block font-semibold text-t1 mt-1 text-base">{totalReports}</span>
              </div>
              <div className="bg-white/5 dark:bg-white/5 border border-border p-3 rounded-xl">
                <span className="mono text-[8px] text-t4 uppercase">Max Rating</span>
                <span className="block font-semibold text-emerald-400 mt-1 text-base">{maxScore}%</span>
              </div>
              <div className="bg-white/5 dark:bg-white/5 border border-border p-3 rounded-xl">
                <span className="mono text-[8px] text-t4 uppercase">Min Rating</span>
                <span className="block font-semibold text-rose-400 mt-1 text-base">{minScore}%</span>
              </div>
              <div className="bg-white/5 dark:bg-white/5 border border-border p-3 rounded-xl">
                <span className="mono text-[8px] text-t4 uppercase">Audited Gaps</span>
                <span className="block font-semibold text-amber-400 mt-1 text-base">{gapCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section compliance status details card */}
        <div className="bg-white/[0.01] dark:bg-white/[0.01] border border-border p-4 rounded-2xl flex flex-col gap-3">
          <h3 className="text-xs font-bold text-t1 uppercase tracking-wider">
            Objective Status Density
          </h3>

          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-xs text-t2 mb-1">
                <span>Compliant Sections</span>
                <span className="mono font-bold text-emerald-400">{compliantCount} / {sections.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 dark:bg-white/5 border border-border rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(compliantCount / sections.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-t2 mb-1">
                <span>Unresolved Gaps & Risks</span>
                <span className="mono font-bold text-amber-500">{gapCount} / {sections.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 dark:bg-white/5 border border-border rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(gapCount / sections.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-t2 mb-1">
                <span>Unaudited / Pending Sections</span>
                <span className="mono font-bold text-t4">{pendingCount} / {sections.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 dark:bg-white/5 border border-border rounded-full overflow-hidden">
                <div className="h-full bg-white/20 dark:bg-white/20 rounded-full" style={{ width: `${(pendingCount / sections.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
