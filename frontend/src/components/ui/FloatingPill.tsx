import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';

export default function FloatingPill({ onBeginAudit }: { onBeginAudit?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Zustand store mappings
  const overallScore = useAppStore((s) => s.overallScore);
  const sections = useAppStore((s) => s.sections);
  const resetAudit = useAppStore((s) => s.resetAudit);
  const setAIState = useAppStore((s) => s.setAIState);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute scan progress
  const scannedCount = sections.filter((s) => s.status !== 'pending').length;
  const totalCount = sections.length;

  const handleReset = () => {
    resetAudit();
    setAIState('idle');
    if (onBeginAudit) onBeginAudit();
    setIsOpen(false);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-white/10 border border-white/20',
    compliant: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    gap: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    critical: 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  };

  return (
    <div className="relative inline-block z-50 text-left" ref={dropdownRef}>
      {/* Outer Pill Container */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3.5 px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(124,58,237,0.18)]"
        style={{
          background: 'rgba(5, 5, 12, 0.78)',
          borderColor: isOpen ? 'rgba(167, 139, 250, 0.45)' : 'rgba(255, 255, 255, 0.08)',
          cursor: 'none',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Left Segment: Floating glowing Neural Icon */}
        <div className="w-5 h-5 rounded-full bg-violet/20 flex items-center justify-center border border-violet/40 shrink-0 relative">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-glow" />
        </div>

        {/* Title */}
        <span className="text-[11px] font-bold tracking-wider text-white uppercase font-display">
          DPDP AI
        </span>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/10" />

        {/* Secondary Info: Neural Status */}
        <span className="mono text-[9px] text-white/50 tracking-widest uppercase">
          {scannedCount > 0 ? `AUDIT IN PROGRESS / ${scannedCount} of ${totalCount}` : 'NEURAL CORE / STANDBY'}
        </span>

        {/* Chevron Arrow */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-white/40 shrink-0 ml-1"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.button>

      {/* Dropdown Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 w-80 rounded-2xl border p-5 shadow-[0_32px_64px_rgba(0,0,0,0.65)]"
            style={{
              background: 'rgba(5, 5, 12, 0.93)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(28px)',
            }}
          >
            {/* Dropdown Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <div>
                <p className="text-[10px] mono text-white/40 uppercase tracking-widest">Compliance Rating</p>
                <h4 className="text-white font-display font-extrabold text-lg mt-0.5">DPDPA 2023</h4>
              </div>
              
              {/* Dynamic Overall Score Circular display */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 rotate-[-90deg]">
                  {/* Background track circle */}
                  <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  {/* Progress circle */}
                  <motion.circle
                    cx="24" cy="24" r="21" fill="none"
                    stroke={overallScore > 75 ? '#10b981' : overallScore > 40 ? '#f59e0b' : '#7c3aed'}
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 21}
                    initial={{ strokeDashoffset: 2 * Math.PI * 21 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 21 * (1 - overallScore / 100) }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-white mono">
                  {overallScore}%
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3.5 mb-4 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status Dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[section.status]}`} />
                    <span className="text-white/70 font-medium truncate">{section.title}</span>
                  </div>
                  <span className="mono text-[10px] text-white/30 shrink-0">
                    {section.status === 'pending' ? 'UNAUDITED' : `${section.score}%`}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions Panel */}
            <div className="border-t border-white/5 pt-3.5 flex gap-2.5">
              <button
                onClick={handleReset}
                className="flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center transition-colors text-rose-400 hover:bg-rose-500/10 border-rose-500/20"
                style={{ cursor: 'none' }}
              >
                Reset Progress
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onBeginAudit) onBeginAudit();
                }}
                className="flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all bg-white text-black hover:bg-white/90"
                style={{ cursor: 'none' }}
              >
                Launch Audit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
