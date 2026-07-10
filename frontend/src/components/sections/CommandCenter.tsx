/**
 * CommandCenter — Dedicated full-screen Report window
 *
 * Layout:
 * ┌─────────────────┬──────────────────────────────────┐
 * │ Left panel      │ Right panel                      │
 * │ - Score arc     │ - Network graph (large)          │
 * │ - Quick stats   │ - Gap register                   │
 * │ - Back button   │ - Timeline                       │
 * └─────────────────┴──────────────────────────────────┘
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { jsPDF } from 'jspdf';

function generateAndDownloadPDF(title: string, score: number, date: string, sections: any[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(124, 58, 237); // Purple accent
  doc.text('DPDPA Compliance Audit Report', 14, 25);
  
  // Metadata block
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`REPORT ID: ${title.toUpperCase().replace(/\s+/g, "_")} | DATE: ${date}`, 14, 32);
  
  // Horizontal divider
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);
  
  // Score Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 42, 182, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 42, 182, 30, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const status = score < 40 ? 'NON-COMPLIANT' : (score < 70 ? 'PARTIAL' : 'COMPLIANT');
  const scoreColor = score < 40 ? [239, 68, 68] : (score < 70 ? [245, 158, 11] : [16, 185, 129]);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`Compliance Score: ${score}/100`, 20, 52);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 104);
  doc.text(`Overall Audit Status: ${status}`, 20, 62);
  
  // Sections findings header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Audit Findings by Section', 14, 85);
  
  // Table header
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Section Description', 16, 94);
  doc.text('Verdict', 130, 94);
  doc.text('Score', 168, 94);
  doc.line(14, 96, 196, 96);
  
  // List items
  let y = 104;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(74, 85, 104);
  
  sections.forEach((s) => {
    if (y > 270) {
      doc.addPage();
      y = 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Section Description', 16, y);
      doc.text('Verdict', 130, y);
      doc.text('Score', 168, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(74, 85, 104);
    }
    
    doc.text(s.title, 16, y);
    doc.text(s.status.toUpperCase(), 130, y);
    doc.text(`${s.score}/100`, 168, y);
    y += 10;
  });
  
  doc.save(`${title.replace(/\s+/g, '_')}_Compliance_Report.pdf`);
}

// ── Score arc ────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const R   = 60;
  const C   = 2 * Math.PI * R;
  const pct = score / 100;
  const col = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={R}
          fill="none" stroke={col} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - C * pct }}
          transition={{ duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${col}60)` }}
        />
        <circle cx="70" cy="70" r={R - 18} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="7" />
        <motion.circle
          cx="70" cy="70" r={R - 18}
          fill="none" stroke="rgba(124,58,237,0.45)" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (R - 18)}
          initial={{ strokeDashoffset: 2 * Math.PI * (R - 18) }}
          animate={{ strokeDashoffset: 2 * Math.PI * (R - 18) * (1 - pct * 0.65) }}
          transition={{ duration: 1.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="display text-3xl" style={{ color: col }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {score}
        </motion.span>
        <span className="mono text-[9px] text-t4">/ 100</span>
      </div>
    </div>
  );
}

// ── DPDPA Section Network Graph ───────────────────────────
function NetworkGraph() {
  const [active, setActive] = useState<string | null>(null);
  const sections = useAppStore((s) => s.sections);

  const nodes = [
    { id: 's6',  x: 50, y: 40, label: 'S.6 Consent',    status: sections.find(s => s.id === 's6')?.status || 'pending' },
    { id: 's7',  x: 75, y: 22, label: 'S.7 Notice',     status: sections.find(s => s.id === 's7')?.status || 'pending' },
    { id: 's8',  x: 28, y: 20, label: 'S.8 Processing', status: sections.find(s => s.id === 's8')?.status || 'pending' },
    { id: 's9',  x: 12, y: 45, label: 'S.9 Special',    status: sections.find(s => s.id === 's9')?.status || 'pending' },
    { id: 's11', x: 25, y: 72, label: 'S.11 Rights',    status: sections.find(s => s.id === 's11')?.status || 'pending' },
    { id: 's12', x: 60, y: 78, label: 'S.12 Grievance', status: sections.find(s => s.id === 's12')?.status || 'pending' },
    { id: 's16', x: 83, y: 58, label: 'S.16 Border',    status: sections.find(s => s.id === 's16')?.status || 'pending' },
    { id: 's17', x: 65, y: 10, label: 'S.17 Exempt',    status: sections.find(s => s.id === 's17')?.status || 'pending' },
  ];
  const edges = [
    ['s6','s7'],['s6','s8'],['s6','s16'],['s7','s8'],
    ['s8','s9'],['s8','s11'],['s11','s12'],['s17','s6'],['s17','s7'],
  ];
  const sc: Record<string, string> = {
    critical: '#ef4444', gap: '#f59e0b', compliant: '#10b981', pending: 'rgba(255,255,255,0.15)',
  };
  const connected = (id: string) =>
    edges.some(([a,b]) => (a === active && b === id) || (b === active && a === id));

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <svg viewBox="0 0 100 90" className="w-full h-full">
        {edges.map(([a, b], i) => {
          const na = nodes.find(n => n.id === a)!;
          const nb = nodes.find(n => n.id === b)!;
          const hi = active && (a === active || b === active);
          return (
            <motion.line key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={hi ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={hi ? 0.8 : 0.4}
              animate={{ opacity: hi ? 1 : 0.5 }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
        {nodes.map((node) => {
          const hi  = active === node.id || connected(node.id);
          const col = sc[node.status];
          return (
            <g key={node.id} style={{ cursor: 'none' }}
              onClick={() => setActive(active === node.id ? null : node.id)}>
              {hi && (
                <circle cx={node.x} cy={node.y} r={5}
                  fill="none" stroke={col} strokeOpacity={0.2} strokeWidth={2} />
              )}
              <motion.circle
                cx={node.x} cy={node.y}
                animate={{ r: hi ? 3.2 : 2.2, fillOpacity: hi ? 1 : 0.6 }}
                fill={col}
                transition={{ duration: 0.2 }}
                style={{ filter: hi ? `drop-shadow(0 0 4px ${col})` : 'none' }}
              />
              {hi && (
                <text x={node.x + 4} y={node.y - 2.5} fontSize="3.5"
                  fill="rgba(255,255,255,0.85)" fontFamily="JetBrains Mono, monospace">
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 flex gap-4">
        {[['Critical','#ef4444'],['Gap','#f59e0b'],['Compliant','#10b981']].map(([k,c]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c as string }} />
            <span className="mono text-[9px] text-t4">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gap item ──────────────────────────────────────────────
const GAPS = [
  { title:'Consent Mechanism Non-Compliant',   desc:'Current acceptance flow does not satisfy free, specific, informed consent.',                    section:'S.6(1), S.6(4)',   sev:'critical' as const },
  { title:'Cross-Border Transfer Violation',   desc:'Analytics routed via US servers without S.16(1)-compliant consent or adequacy assessment.',   section:'S.16(1), Rule 12',  sev:'critical' as const },
  { title:'Incomplete Privacy Notice',         desc:'Missing itemized purposes for all 7 data processing categories.',                              section:'S.5(1), S.7(a)',    sev:'high'     as const },
  { title:'No Automated Data Erasure',         desc:'Data principal erasure rights handled manually; automated endpoint required.',                 section:'S.11(1)(d)',        sev:'medium'   as const },
];
const SEV_COLOR = {
  critical: { dot: '#ef4444', badge: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  high:     { dot: '#f59e0b', badge: 'rgba(245,158,11,0.1)',text: '#f59e0b' },
  medium:   { dot: '#06b6d4', badge: 'rgba(6,182,212,0.1)', text: '#06b6d4' },
};

function GapRow({ g, delay }: { g: typeof GAPS[0]; delay: number }) {
  const c = SEV_COLOR[g.sev];
  return (
    <motion.div
      className="flex gap-3 p-3.5 rounded-xl items-start"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: c.dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium leading-snug">{g.title}</p>
          <span className="shrink-0 mono text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: c.badge, color: c.text }}>
            {g.sev}
          </span>
        </div>
        <p className="text-xs text-t3 leading-relaxed">{g.desc}</p>
        <span className="mono text-[9px] text-t4 mt-1 block">{g.section}</span>
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function CommandCenter({ onBack }: { onBack: () => void }) {
  const score = useAppStore((s) => s.overallScore);
  const sections = useAppStore((s) => s.sections);
  const recentReports = useAppStore((s) => s.recentReports);

  console.log("CommandCenter Render: score =", score, "sections =", sections);

  // Dynamic quick stats calculation from store
  const criticalCount = sections.filter(s => s.status === 'critical').length;
  const gapsCount     = sections.filter(s => s.status === 'gap').length;
  const passedCount   = sections.filter(s => s.status === 'compliant').length;
  const pendingCount  = sections.filter(s => s.status === 'pending').length;

  return (
    <motion.div
      className="w-full h-screen flex overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >

      {/* ══ LEFT PANEL ═══════════════════════════════════ */}
      <aside className="w-72 shrink-0 h-full flex flex-col border-r overflow-y-auto no-scrollbar"
        style={{ background: 'rgba(3,3,10,0.88)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>

        {/* Header */}
        <div className="px-5 py-5 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onBack} className="text-t3 hover:text-t1 transition-colors mr-1" style={{ cursor: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <div className="text-sm font-semibold">Compliance Report</div>
            <div className="mono text-[9px] text-t4">DPDPA 2023 — {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Score */}
        <div className="px-5 py-6 border-b flex flex-col items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <ScoreArc score={score} />
          <div className="text-center">
            <div className="text-sm font-medium mb-0.5">Compliance Score</div>
            <div className="mono text-[10px] text-t3">
              {score < 40 ? 'Non-compliant' : score < 70 ? 'Partial' : 'Compliant'}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-5 py-5 grid grid-cols-2 gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Critical', value: criticalCount.toString(), color: '#ef4444' },
            { label: 'Gaps',     value: gapsCount.toString(), color: '#f59e0b' },
            { label: 'Passed',   value: passedCount.toString(), color: '#10b981' },
            { label: 'Pending',  value: pendingCount.toString(), color: 'var(--t3)' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div className="mono text-[9px] text-t4 mb-1">{s.label}</div>
              <div className="display text-2xl" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="px-5 py-4 border-b flex flex-col min-h-0" style={{ borderColor: 'var(--border)' }}>
          <div className="mono text-[9px] text-t4 uppercase tracking-widest mb-3">Recent Reports</div>
          <div className="space-y-2.5 overflow-y-auto no-scrollbar max-h-48 pr-1">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] transition-all">
                <div className="min-w-0">
                  <div className="text-xs text-t2 font-medium truncate">{r.title}</div>
                  <div className="mono text-[8px] text-t4 mt-0.5">{r.date} ● score: {r.score}%</div>
                </div>
                <button
                  onClick={() => {
                    const mockReportSections = [
                      { title: 'S.6 — Consent', status: 'critical', score: 20 },
                      { title: 'S.7 — Notice', status: 'gap', score: 50 },
                      { title: 'S.8 — Processing Data', status: 'compliant', score: 100 },
                      { title: 'S.9 — Special Data', status: 'compliant', score: 100 },
                      { title: 'S.11 — Data Correction', status: 'compliant', score: 100 },
                      { title: 'S.12 — Grievance', status: 'compliant', score: 100 },
                      { title: 'S.16 — Cross-Border', status: 'critical', score: 0 },
                      { title: 'S.17 — Exemptions', status: 'compliant', score: 100 },
                    ];
                    generateAndDownloadPDF(r.title, r.score, r.date, mockReportSections);
                  }}
                  className="p-1.5 rounded hover:bg-white/5 text-t3 hover:text-t2 transition-colors shrink-0"
                  title="Download PDF"
                  style={{ cursor: 'none' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v6m0 0L4 6m2 2l2-2M2 9.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-5 flex flex-col gap-3 mt-auto">
          <button
            onClick={() => {
              generateAndDownloadPDF("Active_Session_Audit", score, new Date().toLocaleDateString(), sections);
            }}
            className="btn-primary w-full justify-center text-sm py-3"
            style={{ cursor: 'none' }}
          >
            Export Report
          </button>
          <button className="btn-ghost w-full justify-center text-sm py-3" style={{ cursor: 'none' }}>
            Share Link
          </button>
        </div>
      </aside>

      {/* ══ RIGHT PANEL ══════════════════════════════════ */}
      <div className="flex-1 h-full flex flex-col overflow-hidden"
        style={{ background: 'rgba(3,3,10,0.55)', backdropFilter: 'blur(10px)' }}>

        {/* Top: Network graph */}
        <div className="h-[45%] shrink-0 border-b p-6 flex flex-col" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-sm">DPDPA Section Network</h3>
              <p className="mono text-[9px] text-t4 mt-0.5">Click a node to illuminate related sections</p>
            </div>
            <span className="badge">8 sections</span>
          </div>
          <div className="flex-1 min-h-0">
            <NetworkGraph />
          </div>
        </div>

        {/* Bottom: Gap register + Timeline tabs */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-6 flex flex-col gap-5">

          {/* Gap register */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Remediation Register</h3>
              <span className="badge">{GAPS.length} findings</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {GAPS.map((g, i) => <GapRow key={g.title} g={g} delay={i * 0.06} />)}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-medium text-sm mb-3">Remediation Timeline</h3>
            <div className="relative pl-3">
              <div className="absolute left-0 top-0 bottom-0 w-px"
                style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.6) 0%, rgba(6,182,212,0.2) 70%, transparent 100%)' }} />
              {[
                { time:'Wk 1–2',  task:'Implement granular consent manager (S.6)',   col:'#ef4444' },
                { time:'Wk 2–4',  task:'Redirect analytics to Indian endpoint',       col:'#ef4444' },
                { time:'Mo 2',    task:'Rewrite Privacy Notice — itemize 7 purposes', col:'#f59e0b' },
                { time:'Mo 3',    task:'Build automated erasure endpoint (S.11)',      col:'#06b6d4' },
                { time:'Mo 4',    task:'Appoint DPO + Grievance Officer',             col:'#06b6d4' },
              ].map((t, i) => (
                <motion.div key={i} className="flex gap-3 pb-4 last:pb-0 relative"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.07 }}>
                  <div className="absolute -left-[3px] top-1.5 w-2 h-2 rounded-full border-2"
                    style={{ background: '#03030a', borderColor: t.col }} />
                  <div className="pl-4">
                    <div className="mono text-[9px] text-t4 mb-0.5">{t.time}</div>
                    <p className="text-sm text-t2">{t.task}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
