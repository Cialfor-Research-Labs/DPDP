import { useAppStore } from '../../store/appStore';
import { jsPDF } from 'jspdf';

export default function ReportsView() {
  const recentReports = useAppStore((s) => s.recentReports);
  const sections = useAppStore((s) => s.sections);

  // Generate and download assessment report PDF
  const triggerDownloadPDF = (title: string, score: number, date: string) => {
    const doc = new jsPDF();
    
    // Header block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(124, 58, 237); // Purple accent
    doc.text('DPDPA Compliance Assessment Report', 14, 25);
    
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`REPORT: ${title.toUpperCase().replace(/\s+/g, "_")} | DATE: ${date}`, 14, 32);
    
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
    
    // Score Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 42, 182, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 42, 182, 30, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const scoreColor = score < 40 ? [239, 68, 68] : (score < 70 ? [245, 158, 11] : [16, 185, 129]);
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`Overall Score: ${score}/100`, 20, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(74, 85, 104);
    const statusText = score < 40 ? 'CRITICAL COMPLIANCE DEVIATIONS' : (score < 70 ? 'PARTIAL COMPLIANCE REGULATION' : 'SATISFACTORY COMPLIANCE LEVEL');
    doc.text(`Audit Health Status: ${statusText}`, 20, 62);
    
    // Details Findings Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Audit Objective Findings', 14, 85);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Compliance Objective', 16, 94);
    doc.text('Status Verdict', 130, 94);
    doc.text('Section Rating', 168, 94);
    doc.line(14, 96, 196, 96);
    
    let y = 104;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(74, 85, 104);
    
    sections.forEach((s) => {
      doc.text(s.title, 16, y);
      doc.text(s.status.toUpperCase(), 130, y);
      doc.text(`${s.score}/100`, 168, y);
      y += 10;
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}_Audit_Report.pdf`);
  };

  const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/5',
      text: 'text-rose-500',
      border: 'border-rose-500/20 dark:border-rose-500/10',
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/5',
      text: 'text-amber-500',
      border: 'border-amber-500/20 dark:border-amber-500/10',
    },
    ok: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/5',
      text: 'text-emerald-500',
      border: 'border-emerald-500/20 dark:border-emerald-500/10',
    },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 gap-4 text-t1">
      <div>
        <span className="mono text-[9px] uppercase tracking-widest text-violet font-bold">
          Audit Repository
        </span>
        <h2 className="text-xl font-bold text-t1 mt-1">
          Recent Compliance Reports
        </h2>
        <p className="text-xs text-t3 leading-relaxed mt-1">
          Review, analyze, and directly export statutory audit reports compiled by the DPDP engine.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3.5 pr-1 min-h-0">
        {recentReports.map((report) => {
          const style = severityStyles[report.severity] || severityStyles.ok;
          return (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] dark:bg-white/[0.01] border border-border hover:border-white/10 dark:hover:border-white/5 transition-all shadow-sm"
            >
              {/* Left Info block */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-white/5 dark:bg-white/5 border border-border shrink-0">
                  <span className="text-lg font-black text-t1">{report.score}</span>
                  <span className="mono text-[7px] text-t4 uppercase mt-[-2px]">SCORE</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-t1 leading-tight">
                    {report.title}
                  </h3>
                  <p className="text-[10px] text-t4 mt-1 mono">
                    DATE: {report.date} // STATUS: <span className={`uppercase font-bold ${style.text}`}>{report.severity}</span>
                  </p>
                </div>
              </div>

              {/* Right Download Action */}
              <button
                onClick={() => triggerDownloadPDF(report.title, report.score, report.date)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 text-t3 hover:text-t1 border border-border hover:border-white/15 transition-all shadow"
                style={{ cursor: 'none' }}
                title="Download Report PDF"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
