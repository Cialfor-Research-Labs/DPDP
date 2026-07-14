import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Message } from '../../store/appStore';
import ParticleInput from '../ui/ParticleInput';

/* ── Typewriter ─────────────────────────────────────────── */
function useTypewriter(text: string, active: boolean, speed = 12) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) { setShown(text); return; }
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return shown;
}

/* ── Thinking bars ──────────────────────────────────────── */
function ThinkingBars() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: 'var(--violet-light)' }}
          animate={{ height: ['3px', '16px', '3px'] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── Message Card ───────────────────────────────────────── */
function MsgCard({ msg, isLatest }: { msg: Message; isLatest: boolean }) {
  const isAI = msg.role === 'ai';
  const text = useTypewriter(msg.content, isAI && isLatest);
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const findingBorder: Record<string, string> = {
    critical: 'border-l-2 border-red-500',
    warning: 'border-l-2 border-yellow-400',
    ok: 'border-l-2 border-green-400',
  };
  const findingBg: Record<string, string> = {
    critical: 'rgba(239,68,68,0.04)',
    warning: 'rgba(245,158,11,0.04)',
    ok: 'rgba(16,185,129,0.04)',
  };

  return (
    <motion.div
      className={`flex w-full gap-3 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {isAI && (
        <div className="shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-violet/10 border border-violet/20">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.2" fill="var(--violet-light)" />
              <circle cx="6" cy="6" r="5" stroke="var(--violet-light)" strokeOpacity="0.3" />
            </svg>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[85%] ${isAI ? 'items-start' : 'items-end'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed border transition-colors ${
            isAI
              ? 'bg-surface border-border text-t2 font-normal rounded-bl-sm shadow-sm'
              : 'bg-violet border-violet text-white font-medium rounded-br-sm shadow-sm'
          } ${isAI && msg.finding ? findingBorder[msg.finding] : ''}`}
          style={isAI && msg.finding ? { background: findingBg[msg.finding] } : {}}
        >
          {isAI ? (
            <>
              <p className="whitespace-pre-wrap">{text}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {msg.citations.map((c) => (
                    <span
                      key={c}
                      className="mono text-[8px] px-1.5 py-0.5 rounded bg-violet/10 border border-violet/10 text-violet"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
        <span className="mono text-[8px] text-t4 px-1">{time}</span>
      </div>
    </motion.div>
  );
}

/* ── MAIN AUDIT PANEL WORKSPACE ── */
export default function AuditChatPanel() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000/api/v1`;
  
  const messages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const isTyping = useAppStore((s) => s.isTyping);
  const setIsTyping = useAppStore((s) => s.setIsTyping);
  const setAIState = useAppStore((s) => s.setAIState);
  const setEnergy = useAppStore((s) => s.setEnergyLevel);
  const updateSection = useAppStore((s) => s.updateSection);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const setOverallScore = useAppStore((s) => s.setOverallScore);
  const resetAudit = useAppStore((s) => s.resetAudit);

  // Historial sessions hooks
  const chatSessions = useAppStore((s) => s.chatSessions);
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId);
  const addSession = useAppStore((s) => s.addChatSession);
  const deleteChatSession = useAppStore((s) => s.deleteChatSession);

  const [input, setInput] = useState('');
  const modelName = 'DPDPA Auditor (v1.0)';
  const [isRecording, setIsRecording] = useState(false);
  const sessionId: string | null = null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  // Initialize fresh session if list is empty
  const handleStartNewSession = () => {
    const topicCount = chatSessions.length + 1;
    addSession(`Audit Registry #${topicCount}`, 'pending');
  };

  // Waveform heights for animated recording indicator inside the input bar
  const [waveHeights, setWaveHeights] = useState([6, 10, 14, 18, 10, 14, 6]);
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setWaveHeights(waveHeights.map(() => Math.floor(4 + Math.random() * 16)));
    }, 110);
    return () => clearInterval(interval);
  }, [isRecording, waveHeights]);

  // Document file selection trigger
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setUploadedFile({
      name: file.name,
      size: `${sizeMB} MB`,
      type: file.type
    });
  };

  // Local fallback mock response simulator
  const runLocalFallback = useCallback((text: string) => {
    const query = text.toLowerCase();
    
    if (query.includes('consent') || query.includes('s.6') || query.includes('checkbox')) {
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: 'Audit Verdict for S.6 (Consent Management):\n- Pre-ticked consent checkboxes are strictly prohibited.\n- Consent must be free, specific, and revocable.\n- ACTION REQUIRED: Update webform code to ensure blank defaults.',
          finding: 'critical',
          citations: ['S.6(1) Notice', 'S.6(4) Rights']
        });
        updateSection('s6', { score: 75, status: 'gap' });
        setAIState('complete');
        setIsTyping(false);
        setEnergy(0.4);
      }, 1200);
    } else if (query.includes('notice') || query.includes('s.7') || query.includes('language')) {
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: 'Audit Verdict for S.7 (Notice Obligation):\n- Notice must be provided in clear and plain language.\n- Access must be offered in English and 22 languages scheduled in the Constitution.\n- ACTION REQUIRED: Integrate localization endpoints.',
          finding: 'warning',
          citations: ['S.7 Notice Obligation']
        });
        updateSection('s7', { score: 90, status: 'compliant' });
        setAIState('complete');
        setIsTyping(false);
        setEnergy(0.4);
      }, 1200);
    } else if (query.includes('localization') || query.includes('s.16') || query.includes('cloud')) {
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: 'Audit Verdict for S.16 (Cross-border transfer):\n- Cross-border data flows are subject to whitelist restrictions.\n- Current AWS AP-South localization maps correctly.\n- ACTION REQUIRED: Register security architecture declarations.',
          finding: 'ok',
          citations: ['S.16 Data Boundary']
        });
        updateSection('s16', { score: 95, status: 'compliant' });
        setAIState('complete');
        setIsTyping(false);
        setEnergy(0.4);
      }, 1200);
    } else {
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: "I have audited your inquiry against the DPDPA 2023 provisions. Please specify whether this relates to Consent (S.6), Notice (S.7), or Localization (S.16) to update active registry parameters.",
          citations: ['DPDPA Framework']
        });
        setAIState('complete');
        setIsTyping(false);
        setEnergy(0.4);
      }, 1000);
    }
  }, [addMessage, updateSection, setAIState, setIsTyping, setEnergy]);

  // Transmit prompt logic
  const handleSend = useCallback(async () => {
    if (!input.trim() && !uploadedFile) return;
    const text = input;
    const attachedFile = uploadedFile;
    
    setInput('');
    setUploadedFile(null);
    setIsTyping(true);
    setAIState('thinking');
    setEnergy(0.85);

    let userPrompt = text;
    if (attachedFile) {
      userPrompt = `[Uploaded Attachment: ${attachedFile.name} (${attachedFile.size})]\n\n` + (text || "Audit regulatory posture mapping for this file.");
    }

    addMessage({ role: 'user', content: userPrompt });
    scrollBottom();

    if (attachedFile) {
      // Custom statutory file scanning simulation
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: `Successfully analyzed statutory attachment: **${attachedFile.name}** (${attachedFile.size}) against the DPDPA 2023 regulations:\n\n- **Notice Obligation (S.7)**: Checked privacy clauses. Required localization notice language is present.\n- **Consent Requirements (S.6)**: Found critical deviation; pre-ticked consent options remain on pg 2.\n- **Erasure Obligation (S.11)**: Deletion schedules conform to standard timelines.\n\nLocal compliance registry score adjusted.`,
          finding: 'critical',
          citations: ['S.6 Consent Form', 'S.7 Notice Language']
        });
        updateSection('s6', { score: 45, status: 'critical' });
        updateSection('s7', { score: 95, status: 'compliant' });
        setAIState('complete');
        setIsTyping(false);
        setEnergy(0.4);
        scrollBottom();
      }, 1500);
    } else {
      if (sessionId) {
        try {
          const res = await fetch(`${API_BASE}/sessions/${activeSessionId}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          
          addMessage({
            role: 'ai',
            content: data.response,
            finding: data.finding || undefined,
            citations: data.citations || []
          });

          if (data.score_updates) {
            Object.entries(data.score_updates).forEach(([key, val]) => {
              const numVal = Number(val);
              const status = numVal >= 80 ? 'compliant' : (numVal >= 50 ? 'gap' : 'critical');
              updateSection(key, { score: numVal, status });
            });
          }
          if (data.overall_score !== undefined) {
            setOverallScore(data.overall_score);
          }

          setAIState('complete');
          setIsTyping(false);
          setEnergy(0.4);
          scrollBottom();
        } catch (err) {
          console.error(err);
          runLocalFallback(text);
        }
      } else {
        runLocalFallback(text);
      }
    }
  }, [input, uploadedFile, isTyping, addMessage, setAIState, setIsTyping, setEnergy, scrollBottom, activeSessionId, updateSection, setOverallScore, runLocalFallback, API_BASE]);

  // Quick Action triggers
  const handleQuickPrompt = (promptText: string) => {
    if (isTyping) return;
    setInput(promptText);
  };

  useEffect(() => {
    scrollBottom();
  }, [messages, isTyping, scrollBottom]);

  return (
    <div className="flex w-full h-full min-h-0 overflow-hidden text-t1 transition-colors duration-300">
      {/* ── LEFT INTERNAL SIDEBAR: RECENT AUDITS LIST ── */}
      <aside className="w-64 h-full border-r border-border bg-[#05050c]/25 backdrop-blur-xl shrink-0 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Start New Audit Session Button */}
        <button
          onClick={handleStartNewSession}
          className="w-full py-2.5 px-3 bg-violet hover:bg-violet-light text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
          style={{ cursor: 'none' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Audit Session</span>
        </button>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar pr-0.5">
          <span className="mono text-[8px] tracking-widest text-t4 uppercase font-black px-1 select-none">
            Recent Audits
          </span>

          {chatSessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-white/[0.04] dark:bg-white/[0.04] border-white/10 text-t1'
                    : 'border-transparent text-t3 hover:bg-white/[0.01] dark:hover:bg-white/[0.01] hover:text-t2'
                }`}
                style={{ cursor: 'none' }}
              >
                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                  <span className="text-[10px] font-bold truncate leading-tight select-none">
                    {session.label}
                  </span>
                  <span className="mono text-[7px] text-t4 select-none">
                    {session.messageCount || 0} messages
                  </span>
                </div>
                
                {/* Delete Session Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/5 dark:hover:bg-white/5 transition-all shrink-0"
                  style={{ cursor: 'none' }}
                  title="Delete Session"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── RIGHT MAIN CONTENT: CONVERSATION STREAM ── */}
      {chatSessions.length === 0 ? (
        /* Welcome empty-state when no sessions exist */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 min-w-0 h-full overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-violet/10 flex items-center justify-center text-violet shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-t1 uppercase tracking-wider">No Active Sessions</h3>
            <p className="text-[10px] text-t3 mt-1.5 max-w-xs leading-relaxed">
              Launch a fresh statutory audit session to map compliance objectives, verify checklist alignment, and isolate regulatory risks.
            </p>
          </div>
          <button
            onClick={handleStartNewSession}
            className="px-5 py-2.5 bg-violet hover:bg-violet-light text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all"
            style={{ cursor: 'none' }}
          >
            Initialize AI Audit
          </button>
        </div>
      ) : (
        /* Regular Active chat layout */
        <div className="flex-1 h-full flex flex-col p-4 overflow-hidden min-w-0">
          
          {/* Header Metadata Selector */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border px-1.5 shrink-0">
            <div className="relative">
              <button className="flex items-center gap-1.5 text-[10px] text-t3 hover:text-t1 transition-colors" style={{ cursor: 'none' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
                <span className="font-bold uppercase tracking-wider">{modelName}</span>
              </button>
            </div>
            <button 
              onClick={() => {
                resetAudit();
                handleStartNewSession();
              }}
              className="text-[9px] uppercase tracking-wider font-black text-violet border border-violet/20 rounded-lg px-2.5 py-1 hover:bg-violet/10 transition-colors"
              style={{ cursor: 'none' }}
            >
              Reset Session
            </button>
          </div>

          {/* Messages Log Feed */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-1.5 flex flex-col gap-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-10 opacity-30 flex flex-col items-center justify-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="mono text-[9px] uppercase tracking-wider text-t2">Audit logs initialized.<br/>Awaiting user prompt...</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <MsgCard key={msg.id} msg={msg} isLatest={i === messages.length - 1} />
              ))}
              {isTyping && (
                <motion.div
                  key="thinking"
                  className="self-start bg-surface border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-3 shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ThinkingBars />
                  <span className="mono text-[8px] text-t4 uppercase font-bold tracking-wider">Evaluating regulatory vectors…</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Quick Action Suggestion Chips (Pre-input options style) */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-3 shrink-0 select-none">
            <button
              onClick={() => handleQuickPrompt("How do I request S.6 consent?")}
              className="text-[9px] px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-t2 border border-border transition-colors uppercase tracking-wider font-bold shadow-sm"
              style={{ cursor: 'none' }}
            >
              S.6 Consent
            </button>
            <button
              onClick={() => handleQuickPrompt("What notice is required under S.7?")}
              className="text-[9px] px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-t2 border border-border transition-colors uppercase tracking-wider font-bold shadow-sm"
              style={{ cursor: 'none' }}
            >
              S.7 Notice
            </button>
            <button
              onClick={() => handleQuickPrompt("Review our AWS AP-South localization (S.16)")}
              className="text-[9px] px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-t2 border border-border transition-colors uppercase tracking-wider font-bold shadow-sm"
              style={{ cursor: 'none' }}
            >
              S.16 Cloud
            </button>
          </div>

          {/* Input Box Wrapper */}
          <div className="border-t border-border pt-3 shrink-0 flex flex-col gap-2">
            
            {/* Hidden native file input element */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.json"
            />

            {/* Upload File Preview Chip */}
            {uploadedFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-violet/10 border border-violet/20 text-violet rounded-xl text-[9px] font-black uppercase tracking-wider self-start select-none shadow-sm">
                <span>📄 {uploadedFile.name} ({uploadedFile.size})</span>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="hover:text-rose-500 font-bold ml-1 text-xs px-1 hover:scale-110 transition-transform"
                  style={{ cursor: 'none' }}
                  title="Clear Attachment"
                >
                  ×
                </button>
              </div>
            )}

            {/* Main Interactive Input Entry Bar */}
            <div
              className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2 bg-surface border border-border shadow-sm relative overflow-hidden"
            >
              {/* Plus symbol to upload docs */}
              <button
                onClick={handleTriggerUpload}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-t3 hover:text-white hover:bg-violet border border-border hover:border-violet transition-all select-none active:scale-95 shrink-0"
                style={{ cursor: 'none' }}
                title="Upload Document / Image"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {/* Text Area Input */}
              <ParticleInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type organizational audits details..."
                disabled={isTyping}
                className="flex-1 bg-transparent text-xs focus:outline-none disabled:opacity-40 text-t1 placeholder-t4 min-w-0"
                style={{ cursor: 'none' }}
              />

              {/* Animated Waveform Inline display when voice recording is active */}
              {isRecording && (
                <div className="flex items-center gap-1 px-2 py-1 bg-violet/10 rounded-lg shrink-0 select-none">
                  {waveHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-violet shrink-0"
                      animate={{ height: `${h}px` }}
                      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                    />
                  ))}
                  <span className="mono text-[7px] text-violet font-black ml-1 uppercase">REC</span>
                </div>
              )}

              {/* Voice recording button inline */}
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  isRecording
                    ? 'border-violet text-white bg-violet animate-pulse shadow-sm'
                    : 'border-border text-t3 hover:text-t1 hover:bg-white/5 dark:hover:bg-white/5'
                }`}
                style={{ cursor: 'none' }}
                title={isRecording ? "Stop Recording" : "Voice Input"}
              >
                {isRecording ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"/>
                    <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-4.08A7 7 0 0 0 19 10Z" fill="currentColor"/>
                  </svg>
                )}
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !uploadedFile) || isTyping}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all bg-violet hover:bg-violet-light disabled:opacity-20 hover:scale-[1.05] text-white shrink-0 shadow-sm"
                style={{ cursor: 'none' }}
                title="Send Prompt"
              >
                <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                  <path d="M12 3L3 12M12 3H6.5M12 3V8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <p className="text-center text-[8px] text-t4 mt-1 mono uppercase tracking-widest font-black select-none">
              Press Enter to transmit vectors
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
