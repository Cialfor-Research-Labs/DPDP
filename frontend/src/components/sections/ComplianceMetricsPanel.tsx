import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { jsPDF } from 'jspdf';

interface TimelineStep {
  time: string;
  task: string;
}

interface TimelineDay {
  day: string;
  title: string;
  steps: TimelineStep[];
}

const REMEDIATION_PLAN: Record<string, TimelineDay> = {
  '1': {
    day: 'Phase 1',
    title: 'Consent & Notice Infrastructure',
    steps: [
      { time: '09:00 AM', task: 'Audit Consent Checkboxes (S.6) — Disable pre-ticked defaults.' },
      { time: '01:00 PM', task: 'Formulate Privacy Notices (S.7) — Add statutory language.' },
      { time: '04:00 PM', task: 'Publish Notice Webforms — Link to user profile panels.' },
    ],
  },
  '2': {
    day: 'Phase 2',
    title: 'Data Rights & Erasure Systems',
    steps: [
      { time: '10:00 AM', task: 'Create Erasure SLA (S.11) — Set 72-hour automated deletion script.' },
      { time: '02:00 PM', task: 'Test User Request Webhooks — Establish access log audit logs.' },
    ],
  },
  '3': {
    day: 'Phase 3',
    title: 'DPO & Grievance Registration',
    steps: [
      { time: '11:00 AM', task: 'Nominate Grievance Officer (S.12) — Update contact footers.' },
      { time: '03:00 PM', task: 'Register DPO on government portal — Publish redress templates.' },
    ],
  },
  '4': {
    day: 'Phase 4',
    title: 'Localization & Cloud Security',
    steps: [
      { time: '09:30 AM', task: 'Trace analytics pipeline (S.16) — Route Segment traffic locally.' },
      { time: '03:30 PM', task: 'Configure KMS Key rotation (S.8) — Encrypt fields at rest.' },
    ],
  },
  '5': {
    day: 'Phase 5',
    title: 'Statutory Audits & Checklists',
    steps: [
      { time: '09:00 AM', task: 'Schedule external audit (S.15) — File compliance report.' },
      { time: '02:00 PM', task: 'Train personnel on DPDPA guidelines — Archive logs.' },
    ],
  },
};

export default function ComplianceMetricsPanel() {
  const sections = useAppStore((s) => s.sections);
  const overallScore = useAppStore((s) => s.overallScore);
  const [activeDay, setActiveDay] = useState<string>('1');

  // Compute status distributions
  const total = sections.length;
  const compliant = sections.filter((s) => s.status === 'compliant').length;
  const warning = sections.filter((s) => s.status === 'gap').length;
  const critical = sections.filter((s) => s.status === 'critical').length;
  const pending = sections.filter((s) => s.status === 'pending').length;

  // Donut chart stroke math
  const radius = 36;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const pctCompliant = compliant / total;
  const pctWarning = warning / total;
  const pctCritical = critical / total;

  const compliantOffset = circumference * (1 - pctCompliant);
  const warningOffset = circumference * (1 - pctWarning);
  const criticalOffset = circumference * (1 - pctCritical);

  // Generate and download audit report PDF
  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Header block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 90, 54); // Coral accent
    doc.text('DPDPA Compliance Audit Report', 14, 25);
    
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`REPORT ID: DPDPA_AUDIT_REPORT | DATE: ${new Date().toLocaleDateString()}`, 14, 32);
    
    doc.setDrawColor(255, 90, 54);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
    
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 42, 182, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 42, 182, 30, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const scoreColor = overallScore < 40 ? [239, 68, 68] : (overallScore < 70 ? [245, 158, 11] : [16, 185, 129]);
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`Rating: ${overallScore}/100`, 20, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(74, 85, 104);
    doc.text(`Compliant Sections: ${compliant} | Critical Gaps: ${critical} | Warnings: ${warning}`, 20, 62);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Audit Status Breakdown', 14, 85);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Compliance Objective', 16, 94);
    doc.text('Audit Verdict', 130, 94);
    doc.text('Section Score', 168, 94);
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
    
    doc.save(`DPDPA_Compliance_Audit_Report.pdf`);
  };

  const selectedDayPlan = REMEDIATION_PLAN[activeDay] || REMEDIATION_PLAN['1'];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4 text-t1">
      
      {/* ── Donut Score Metrics Card ── */}
      <div className="bg-white/[0.01] dark:bg-white/[0.01] border border-white/[0.03] dark:border-white/[0.03] rounded-3xl p-4 flex flex-col gap-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-t1 uppercase tracking-wider">
            Risk & Score Metrics
          </h3>
          <button className="text-[10px] text-t4 hover:text-t2 transition-colors" style={{ cursor: 'none' }}>
            🡥
          </button>
        </div>

        {/* Donut Chart Display */}
        <div className="flex items-center justify-between gap-4 py-1 select-none">
          {/* SVG Donut */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 rotate-[-90deg]">
              {/* Bottom Track (Pending) */}
              <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--bg)" strokeWidth={strokeWidth} />
              
              {/* Compliant segment */}
              {compliant > 0 && (
                <circle
                  cx="48" cy="48" r={radius} fill="none" stroke="#10b981" strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={compliantOffset}
                  strokeLinecap="round"
                />
              )}

              {/* Warning segment */}
              {warning > 0 && (
                <circle
                  cx="48" cy="48" r={radius} fill="none" stroke="#f59e0b" strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={warningOffset}
                  transform={`rotate(${(compliant / total) * 360} 48 48)`}
                  strokeLinecap="round"
                />
              )}

              {/* Critical segment */}
              {critical > 0 && (
                <circle
                  cx="48" cy="48" r={radius} fill="none" stroke="#ef4444" strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={criticalOffset}
                  transform={`rotate(${((compliant + warning) / total) * 360} 48 48)`}
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sm font-black text-t1">{overallScore}%</span>
              <span className="mono text-[7px] text-t4 uppercase">SCORE</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="flex-1 flex flex-col gap-1.5 text-[10px]">
            <div className="flex items-center justify-between text-t3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Compliant
              </span>
              <span className="font-semibold text-t1">{compliant}</span>
            </div>
            <div className="flex items-center justify-between text-t3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> Warnings
              </span>
              <span className="font-semibold text-t1">{warning}</span>
            </div>
            <div className="flex items-center justify-between text-t3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Critical
              </span>
              <span className="font-semibold text-t1">{critical}</span>
            </div>
            <div className="flex items-center justify-between text-t3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 dark:bg-white/10 shrink-0" /> Pending
              </span>
              <span className="font-semibold text-t1">{pending}</span>
            </div>
          </div>
        </div>

        {/* CTA Optimization button */}
        <button
          onClick={handleDownloadReport}
          className="w-full py-2 rounded-xl bg-violet hover:bg-violet-light text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
          style={{ cursor: 'none' }}
        >
          <span>Export Compliance PDF</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
      </div>

      {/* ── Remediation Timeline Card ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white/[0.01] dark:bg-white/[0.01] border border-white/[0.03] dark:border-white/[0.03] rounded-3xl p-4 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-t1 uppercase tracking-wider">
            Remediation Plan
          </h3>
          <button className="text-[10px] text-t4 hover:text-t2 transition-colors" style={{ cursor: 'none' }}>
            🡥
          </button>
        </div>

        {/* Step Timelines (Day 1..5 buttons) */}
        <div className="flex justify-between items-center gap-1 shrink-0 bg-white/5 dark:bg-white/5 p-1 rounded-xl">
          {['1', '2', '3', '4', '5'].map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                activeDay === d
                  ? 'bg-violet text-white shadow-sm'
                  : 'text-t3 hover:text-t1'
              }`}
              style={{ cursor: 'none' }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Timeline roadmap tasks */}
        <div className="flex-1 flex flex-col gap-3.5 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
          <div className="pb-1 select-none">
            <span className="mono text-[8px] uppercase tracking-widest text-violet font-black">
              {selectedDayPlan.day} Roadmap
            </span>
            <h4 className="text-xs font-bold text-t1 mt-0.5">
              {selectedDayPlan.title}
            </h4>
          </div>

          <div className="flex flex-col gap-3.5 relative pl-3.5 border-l border-border z-10">
            {selectedDayPlan.steps.map((step, idx) => (
              <div key={idx} className="flex flex-col gap-1 relative text-[11px] leading-relaxed">
                {/* Visual node on timeline */}
                <div className="absolute -left-[18.5px] top-1.5 w-2 h-2 rounded-full bg-violet border border-surface shadow-sm z-20" />
                <span className="mono text-[8px] text-t4 tracking-widest font-black uppercase">
                  {step.time}
                </span>
                <p className="text-t2 font-medium">
                  {step.task}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
