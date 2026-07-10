/**
 * Interview — Full-screen AI Compliance Chat App
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ Sidebar (collapsible)  │  Chat panel                  │
 * │ ─────────────────────  │  ─────────────────────       │
 * │ [≡ collapse toggle]    │  [Header: AI avatar + status]│
 * │ [+ New Audit]          │                              │
 * │                        │  [Messages — scrollable]     │
 * │ RECENT CHATS           │                              │
 * │  Consent ●             │                              │
 * │  Analytics ●           │                              │
 * │                        │                              │
 * │ DPDPA COVERAGE         │  ──────────────────────────  │
 * │  S.6 ○  S.7 ○         │  [ Prominent input bar     ] │
 * │  ...                   │  [🔗 📎  Type here... [→]] │
 * │                        │                              │
 * │ SCORE  42%             │                              │
 * │                        │                              │
 * │ RECENT REPORTS         │                              │
 * │  Q2 Audit 42%          │                              │
 * │  Q1 Audit 61%          │                              │
 * │                        │                              │
 * │ [View Report →]        │                              │
 * └────────────────────────┴──────────────────────────────┘
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Message } from '../../stores/appStore';

/* ── Typewriter ─────────────────────────────────────────── */
function useTypewriter(text: string, active: boolean, speed = 14) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) { setShown(text); return; }
    setShown('');
    let i = 0;
    const id = setInterval(() => { i++; setShown(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return shown;
}

/* ── Thinking bars ──────────────────────────────────────── */
function ThinkingBars() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0,1,2,3,4].map((i) => (
        <motion.div key={i} className="w-[3px] rounded-full"
          style={{ background: 'var(--violet-light)' }}
          animate={{ height: ['3px','16px','3px'] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── Message card ───────────────────────────────────────── */
function MsgCard({ msg, isLatest }: { msg: Message; isLatest: boolean }) {
  const isAI  = msg.role === 'ai';
  const text  = useTypewriter(msg.content, isAI && isLatest);
  const time  = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const findingBorder: Record<string, string> = {
    critical: 'border-l-2 border-red-500',
    warning:  'border-l-2 border-yellow-400',
    ok:       'border-l-2 border-green-400',
  };
  const findingBg: Record<string, React.CSSProperties> = {
    critical: { background: 'rgba(239,68,68,0.05)' },
    warning:  { background: 'rgba(245,158,11,0.05)' },
    ok:       { background: 'rgba(16,185,129,0.05)' },
  };

  return (
    <motion.div
      className={`flex w-full gap-3 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Avatar */}
      {isAI && (
        <div className="shrink-0 mt-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2" fill="var(--violet-light)" />
              <circle cx="6" cy="6" r="5" stroke="var(--violet-light)" strokeOpacity="0.35" />
            </svg>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[80%] ${isAI ? 'items-start' : 'items-end'}`}>
        <div
          className={`
            rounded-2xl px-4 py-3.5 text-sm leading-relaxed
            ${isAI
              ? `glass ${msg.finding ? findingBorder[msg.finding] : ''}`
              : 'rounded-br-sm'
            }
          `}
          style={isAI
            ? (msg.finding ? findingBg[msg.finding] : {})
            : { background: 'rgba(255,255,255,0.92)', color: '#03030a', borderRadius: '16px 16px 4px 16px' }
          }
        >
          {isAI ? (
            <>
              <p className="whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>{text}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {msg.citations.map((c) => (
                    <span key={c}
                      className="mono text-[9px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--violet-light)', border: '1px solid rgba(124,58,237,0.2)' }}
                    >{c}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="font-medium">{msg.content}</p>
          )}
        </div>
        <span className="mono text-[9px] text-t4 px-1">{time}</span>
      </div>
    </motion.div>
  );
}

/* ── Severity dot (static — no pulse) ──────────────────── */
function SevDot({ sev }: { sev: string }) {
  const col: Record<string,string> = { critical:'#ef4444', warning:'#f59e0b', ok:'#10b981', pending:'rgba(255,255,255,0.12)', gap:'#f59e0b', compliant:'#10b981' };
  return <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col[sev] ?? col.pending }} />;
}

/* ── AI response dataset ────────────────────────────────── */
const AI_RESPONSES = [
  {
    keywords: ['aws','amazon','s3','cloud','mumbai','ap-south'],
    label: 'Cloud', severity: 'warning' as const,
    sections: ['s16','s8'],
    response: 'AWS ap-south-1 satisfies Section 16 localization for most categories.\n\nIMPORTANT: If analytics or telemetry flow through US-based SaaS (Segment, Amplitude, Datadog), that triggers S.16(1) cross-border restrictions.\n\nHow do users give consent on your platform?',
    finding: 'warning' as const, citations: ['S.16(1)', 'Rule 12'],
  },
  {
    keywords: ['consent','terms','checkbox','accept','agree','click'],
    label: 'Consent', severity: 'critical' as const,
    sections: ['s6','s7'],
    response: 'Standard "I agree to terms" does NOT satisfy DPDPA S.6(1).\n\nRequired under DPDPA 2023:\n— Purpose-specific consent per category\n— Free, informed, unambiguous\n— Revocable without penalty\n— Separate from T&Cs\n\nThis is a critical gap. Flagged in your remediation register.',
    finding: 'critical' as const, citations: ['S.6(1)', 'S.6(4)', 'S.13'],
  },
  {
    keywords: ['analytics','mixpanel','amplitude','google analytics','segment','us','usa','europe','eu'],
    label: 'Analytics', severity: 'critical' as const,
    sections: ['s16'],
    response: 'Cross-border transfer to non-notified countries (US, EU) is prohibited under S.16(1).\n\nAs of 2025, the Government has not notified any country as a permitted destination. All processing must remain within India.\n\nDo you have a Grievance Officer and data deletion mechanism?',
    finding: 'critical' as const, citations: ['S.16(1)', 'S.16(2)'],
  },
  {
    keywords: ['dpo','officer','grievance','complaint','delete','erasure','retention'],
    label: 'Rights', severity: 'warning' as const,
    sections: ['s11','s12'],
    response: 'Two gaps detected:\n\n1. Grievance mechanism (S.12) must be publicly accessible with a designated officer — manual email does not qualify.\n\n2. Data Principal erasure (S.11) must be automated, not manual. Response SLA is 72 hours under Draft Rules.\n\nHave you implemented audit logging for all data access?',
    finding: 'warning' as const, citations: ['S.11', 'S.12', 'Draft Rule 7'],
  },
];

const INIT_MSG = {
  role: 'ai' as const,
  content: 'DPDPA 2023 Neural Audit initialized.\n\nI\'ll interview your organization\'s data architecture to identify compliance gaps across all 44 sections of the Digital Personal Data Protection Act.\n\nTo begin — describe where you store personal data, how you collect consent, and whether any data leaves India.',
  citations: ['S.2(t)', 'S.4', 'S.6'],
};

function mapObligationIdToSectionId(obId: string): string {
  if (!obId) return '';
  const lower = obId.toLowerCase();
  if (lower.includes('s5_1') || lower.includes('s5_2') || lower.includes('notice')) return 's7';
  if (lower.includes('s6') || lower.includes('consent')) return 's6';
  if (lower.includes('s8_5') || lower.includes('security')) return 's8';
  if (lower.includes('s8_6') || lower.includes('breach')) return 's8';
  if (lower.includes('s9') || lower.includes('child')) return 's9';
  if (lower.includes('s10_2') || lower.includes('dpo')) return 's12';
  if (lower.includes('s11') || lower.includes('rights')) return 's11';
  if (lower.includes('s12') || lower.includes('grievance')) return 's12';
  if (lower.includes('s16') || lower.includes('border')) return 's16';
  if (lower.includes('s17') || lower.includes('exempt')) return 's17';
  return '';
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Interview({ onViewReport, onGoHome }: { onViewReport: () => void; onGoHome?: () => void }) {
  const messages      = useAppStore((s) => s.messages);
  const addMessage    = useAppStore((s) => s.addMessage);
  const isTyping      = useAppStore((s) => s.isTyping);
  const setIsTyping   = useAppStore((s) => s.setIsTyping);
  const setAIState    = useAppStore((s) => s.setAIState);
  const setEnergy     = useAppStore((s) => s.setEnergyLevel);
  const chatSessions  = useAppStore((s) => s.chatSessions);
  const addSession    = useAppStore((s) => s.addChatSession);
  const updateSection = useAppStore((s) => s.updateSection);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId);
  const updateChatSession = useAppStore((s) => s.updateChatSession);
  const setOverallScore = useAppStore((s) => s.setOverallScore);
  const resetAudit    = useAppStore((s) => s.resetAudit);

  const [input, setInput]       = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [sessionSaved, setSaved]  = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  // Local fallback parser
  const runLocalFallback = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const match = AI_RESPONSES.find((r) => r.keywords.some((k) => lower.includes(k)));

    if (match) {
      match.sections.forEach((sid) => {
        updateSection(sid, { status: match.severity === 'critical' ? 'critical' : 'gap', score: match.severity === 'critical' ? 20 : 50 });
      });
      if (!sessionSaved) {
        addSession(match.label, match.severity);
        setSaved(true);
      }
    }

    const fallback = {
      response: 'Cross-referencing your response against DPDPA 2023 framework.\n\nCould you tell me more about data retention periods and how you handle user deletion requests?',
      finding: undefined, citations: ['S.11', 'S.8(7)'],
    };
    const reply = match ?? fallback;

    const delay = 1100 + Math.random() * 900;
    setTimeout(() => {
      setIsTyping(false);
      setAIState('responding');
      setEnergy(0.6);
      addMessage({
        role: 'ai',
        content: reply.response,
        finding: 'finding' in reply ? reply.finding : undefined,
        citations: reply.citations,
      });
      setTimeout(() => { setAIState('listening'); setEnergy(0.35); }, 2000);
      scrollBottom();
    }, delay);
  }, [addMessage, addSession, scrollBottom, sessionSaved, setAIState, setEnergy, setIsTyping, updateSection]);

  // Init first AI message when active session changes to a new empty session
  useEffect(() => {
    if (!activeSessionId) return;
    
    // Ignore demo sessions
    if (activeSessionId.startsWith('demo-')) return;
    
    // Only initialize if the session is empty
    if (messages.length > 0) return;

    setAIState('responding');
    setIsTyping(true);
    setEnergy(0.55);

    // REST call to initialize backend engine
    fetch('http://localhost:8000/api/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: "Significant Data Fiduciary",
        processes_children_data: true,
        transfers_data_outside_india: true,
        has_data_breach: true,
        pre_existing_consent: true
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Backend offline");
        return res.json();
      })
      .then(data => {
        setSessionId(data.session_id);
        setIsTyping(false);
        setAIState('listening');
        if (data.first_question) {
          addMessage({
            role: 'ai',
            content: `DPDPA 2023 Neural Audit session initialized.\n\nFirst Audit Query:\n${data.first_question.question_text}`,
            citations: ['S.6(1)', 'S.5']
          });
        } else {
          addMessage(INIT_MSG);
        }
        setEnergy(0.35);
        scrollBottom();
      })
      .catch(err => {
        console.warn("Backend API offline, falling back to local simulation:", err);
        setIsTyping(false);
        setAIState('listening');
        addMessage(INIT_MSG);
        setEnergy(0.35);
        scrollBottom();
      });
  }, [activeSessionId, messages.length, addMessage, setAIState, setIsTyping, setEnergy, scrollBottom]);

  useEffect(scrollBottom, [messages, isTyping, scrollBottom]);

  // Handle send
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    addMessage({ role: 'user', content: text });

    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('report') ||
      lowerText.includes('score') ||
      lowerText.includes('dashboard') ||
      lowerText.includes('gap register')
    ) {
      setAIState('responding');
      addMessage({
        role: 'ai',
        content: "Understood. Compiling current vectors and transitioning to the Compliance Report Dashboard.",
        citations: ['S.5', 'S.6']
      });
      setTimeout(() => {
        onViewReport();
      }, 1000);
      return;
    }

    setAIState('thinking');
    setIsTyping(true);
    setEnergy(0.85);

    if (sessionId) {
      fetch('http://localhost:8000/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answer: text })
      })
        .then(res => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then(data => {
          console.log("Interview: /api/message response =", data);
          setIsTyping(false);
          setAIState('responding');
          setEnergy(0.6);

          const finding = data.verdict === 'PRESENT' ? 'ok' : (data.verdict === 'MISSING' ? 'critical' : 'warning');
          
          addMessage({
            role: 'ai',
            content: data.ai_response,
            finding,
            citations: [data.citation]
          });

          if (data.obligation_id) {
            const mappedId = mapObligationIdToSectionId(data.obligation_id);
            if (mappedId) {
              updateSection(mappedId, {
                status: data.obligation_status,
                score: data.verdict === 'PRESENT' ? 100 : 0
              });
            }
          }

          if (typeof data.overall_score === 'number') {
            setOverallScore(data.overall_score);
          }

          if (!sessionSaved && data.obligation_id && activeSessionId) {
            updateChatSession(activeSessionId, {
              label: "Audit Segment",
              severity: finding === 'ok' ? 'ok' : 'critical'
            });
            setSaved(true);
          }

          setTimeout(() => { setAIState('listening'); setEnergy(0.35); }, 2000);
          scrollBottom();
        })
        .catch(err => {
          console.warn("API request failed, falling back to local parser:", err);
          runLocalFallback(text);
        });
    } else {
      runLocalFallback(text);
    }
  }, [input, isTyping, sessionId, addMessage, setAIState, setIsTyping, setEnergy, scrollBottom, sessionSaved, activeSessionId, updateChatSession, updateSection, setOverallScore, runLocalFallback]);

  // New audit
  function handleNewAudit() {
    resetAudit();
    addSession("Active Audit", "pending");
    setSaved(false);
    setAIState('idle');
    setEnergy(0.3);
  }

  return (
    <motion.div
      className="w-full h-screen flex overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
    >

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 260 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0 h-full flex flex-col overflow-hidden border-r"
        style={{
          background: 'rgba(4,3,12,0.92)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* ── Sidebar header ─── */}
        <div className="shrink-0 h-14 flex items-center px-3 gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ cursor: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.4)" />
              <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.4)" />
              <rect x="1" y="9.5" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.4)" />
            </svg>
          </button>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={onGoHome}
              className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-all"
              style={{ cursor: 'none' }}
            >
              <div className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <circle cx="4.5" cy="4.5" r="1.5" fill="var(--violet-light)" />
                  <circle cx="4.5" cy="4.5" r="4" stroke="var(--violet-light)" strokeOpacity="0.3" />
                </svg>
              </div>
              <span className="text-sm font-semibold truncate">DPDPA Engine</span>
            </motion.div>
          )}
        </div>

        {/* ── Sidebar body (hidden when collapsed) ─── */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-y-auto no-scrollbar min-h-0"
            >
              {/* New audit button */}
              <div className="px-3 pt-3 pb-2">
                <button
                  onClick={handleNewAudit}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
                  style={{
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    color: 'var(--violet-light)',
                    cursor: 'none',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  New Audit
                </button>
              </div>

               {/* Recent chats */}
              <div className="px-3 pt-2 pb-1">
                <p className="mono text-[9px] text-t4 uppercase tracking-widest mb-2">Recent Chats</p>
                <div className="space-y-0.5">
                  {chatSessions.slice(0, 10).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        activeSessionId === s.id
                          ? 'bg-violet/15 text-t1 border border-violet/25'
                          : 'hover:bg-white/[0.03] border border-transparent'
                      }`}
                      style={{ cursor: 'none' }}
                    >
                      <SevDot sev={s.severity} />
                      <span className="text-xs text-t3 truncate flex-1">{s.label}</span>
                      <span className="mono text-[9px] text-t4 shrink-0">{s.messageCount}msg</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Collapsed: icon strip ─── */}
        {collapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-3">
            <button onClick={handleNewAudit}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ cursor: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5v10M1.5 6.5h10" stroke="rgba(124,58,237,0.8)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Bottom CTA ─── */}
        {!collapsed && (
          <div className="shrink-0 p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button onClick={onViewReport}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'none' }}
            >
              <span>View Report</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </motion.aside>

      {/* ══ CHAT PANEL ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0"
        style={{ background: 'rgba(3,3,10,0.5)', backdropFilter: 'blur(8px)' }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="shrink-0 h-14 flex items-center justify-between px-5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="2.2" fill="var(--violet-light)" />
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="var(--violet-light)" strokeOpacity="0.3" />
                </svg>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: isTyping ? '#f59e0b' : '#10b981', borderColor: '#03030a' }} />
            </div>
            <div>
              <div className="text-sm font-semibold">DPDPA Neural Auditor</div>
              <div className="mono text-[10px]" style={{ color: isTyping ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>
                {isTyping ? 'Analyzing…' : 'Ready'}
              </div>
            </div>
          </div>
          {/* Window dots */}
          <div className="flex gap-1.5">
            {['rgba(239,68,68,0.5)','rgba(245,158,11,0.5)','rgba(16,185,129,0.5)'].map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-6 flex flex-col gap-5">
          {messages.length === 0 && !isTyping && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="8" fill="none" stroke="rgba(124,58,237,0.6)" strokeWidth="2" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5" />
                <circle cx="20" cy="20" r="3" fill="rgba(124,58,237,0.5)" />
              </svg>
              <p className="mono text-[11px] text-t4 text-center">Neural Audit Engine<br />Initializing…</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MsgCard key={msg.id} msg={msg} isLatest={i === messages.length - 1} />
            ))}
            {isTyping && (
              <motion.div key="thinking"
                className="self-start glass rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <ThinkingBars />
                <span className="mono text-[10px] text-t4">Analyzing DPDPA vectors…</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* ══ INPUT BAR — very prominent ═══════════════════ */}
        <div className="shrink-0 px-4 pb-5 pt-3">
          {/* Outer wrapper with clear visual separation */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 0 1px rgba(124,58,237,0.1), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Attachment hint */}
            <button
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ cursor: 'none', color: 'rgba(255,255,255,0.3)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 7.5L7.5 13C5.84 14.66 3.16 14.66 1.5 13C-0.16 11.34-0.16 8.66 1.5 7L7 1.5C8.1 0.4 9.9 0.4 11 1.5C12.1 2.6 12.1 4.4 11 5.5L5.5 11C5 11.5 4 11.5 3.5 11C3 10.5 3 9.5 3.5 9L9 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Describe your data architecture, consent mechanism, or AWS setup…"
              disabled={isTyping}
              className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-40"
              style={{
                color: 'rgba(255,255,255,0.9)',
                cursor: 'none',
              }}
            />
            <style>{`input::placeholder { color: rgba(255,255,255,0.25); }`}</style>

            {/* Character hint */}
            {input.length > 0 && (
              <span className="mono text-[9px] shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {input.length}
              </span>
            )}

            {/* Send */}
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-25 transition-colors"
              style={{
                background: input.trim() && !isTyping ? '#ffffff' : 'rgba(255,255,255,0.08)',
                color: input.trim() && !isTyping ? '#03030a' : 'rgba(255,255,255,0.3)',
                cursor: 'none',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M12 3L3 12M12 3H6.5M12 3V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.button>
          </div>

          {/* Shortcuts hint */}
          <p className="text-center mono text-[9px] text-t4 mt-2">
            Press <kbd className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>Enter</kbd> to send
          </p>
        </div>
      </div>
    </motion.div>
  );
}
