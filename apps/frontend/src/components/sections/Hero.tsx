/**
 * Hero — Fixed:
 * - Dark radial veil behind text for readability
 * - Static chips (no animate-pulse on passive elements)
 * - Pulse only on the live "Neural Engine Active" indicator
 */

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

function DataChip({
  label, value, status, x, y, delay = 0,
}: {
  label: string; value: string;
  status: 'ok' | 'warn' | 'crit';
  x: string; y: string; delay?: number;
}) {
  const colors = { ok: '#10b981', warn: '#f59e0b', crit: '#ef4444' };
  return (
    <motion.div
      className="absolute glass rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[120px] pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay + 1.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="mono text-[9px] text-t3 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        {/* Static dot — no pulse on passive display */}
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors[status] }} />
        <span className="font-display text-sm font-semibold" style={{ color: colors[status] }}>{value}</span>
      </div>
    </motion.div>
  );
}

function RevealWord({ word, delay }: { word: string; delay: number }) {
  return (
    <span className="inline-block overflow-hidden">
      <motion.span
        className="inline-block"
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {word}
      </motion.span>
    </span>
  );
}

export default function Hero({ onBeginAudit }: { onBeginAudit: () => void }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 18 });
  const px = useTransform(springX, [-1, 1], [-14, 14]);
  const py = useTransform(springY, [-1, 1], [-9, 9]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) * 2 - 1);
      mouseY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', h, { passive: true });
    return () => window.removeEventListener('mousemove', h);
  }, [mouseX, mouseY]);

  const h1 = ['Intelligent', 'Legal'];
  const h2 = ['Compliance.'];

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* ── Dark readability veil behind text ────────────── */}
      {/* Prevents white particles from washing out white text */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(3,3,10,0.72) 0%, rgba(3,3,10,0.35) 60%, transparent 100%)',
        }}
      />

      {/* ── Ambient glow pools (dim, no animation) ────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div style={{
          position: 'absolute', width: 500, height: 500, top: '10%', left: '5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, bottom: '8%', right: '3%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* ── Floating holographic chips (parallax) ─────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ x: px, y: py }}
      >
        <DataChip label="Sections Scanned" value="44 / 44" status="ok"   x="7%"  y="20%" delay={0} />
        <DataChip label="Critical Risks"   value="3 Active" status="crit" x="78%" y="17%" delay={0.1} />
        <DataChip label="Cross-border"     value="S.16 Gap" status="warn" x="80%" y="70%" delay={0.2} />
        <DataChip label="Last Audit"       value="Now"       status="ok"   x="5%"  y="68%" delay={0.3} />
      </motion.div>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="relative z-[3] flex flex-col items-center text-center px-6 max-w-5xl mx-auto">

        {/* Status badge — pulse ONLY on the live indicator dot */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <span className="badge badge-active">
            {/* Only this dot pulses — it's live status, not decoration */}
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Neural Engine Active — DPDPA 2023
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="display text-[clamp(3.5rem,9vw,7.5rem)] mb-8">
          <div className="flex gap-[0.22em] justify-center mb-1">
            {h1.map((w, i) => <RevealWord key={w} word={w} delay={0.5 + i * 0.11} />)}
          </div>
          <div className="flex gap-[0.22em] justify-center">
            {h2.map((w, i) => <RevealWord key={w} word={w} delay={0.72 + i * 0.11} />)}
          </div>
        </h1>

        {/* Subtext — slightly dimmed so headline dominates */}
        <motion.p
          className="text-base md:text-lg leading-relaxed mb-14 font-light max-w-lg"
          style={{ color: 'rgba(255,255,255,0.58)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1.2 }}
        >
          AI-powered DPDPA 2023 audit engine. Interviews your architecture,
          detects legal gaps, generates auditor-grade reports.
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-4 justify-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="btn-primary" onClick={onBeginAudit}>
            Begin Audit
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="btn-ghost" onClick={onBeginAudit}>
            View Sample Report
          </button>
        </motion.div>
      </div>

      {/* Scroll cue — no pulse, just a gentle bob */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[3]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <span className="mono text-[9px] tracking-widest">SCROLL</span>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
