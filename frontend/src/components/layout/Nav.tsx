/**
 * Nav — Ultra-minimal floating navigation
 * Glassmorphic backdrop on scroll, cinematic transitions
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Nav({
  onBeginAudit,
  onViewReport,
  onGoHome,
}: {
  onBeginAudit?: () => void;
  onViewReport?: () => void;
  onGoHome?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled ? 'py-3' : 'py-6'
      }`}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`mx-auto max-w-7xl px-6 flex items-center justify-between ${
        scrolled ? 'glass rounded-2xl py-3 px-5 mx-4' : ''
      }`}>
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 group"
          style={{ cursor: 'none' }}
          onClick={(e) => {
            e.preventDefault();
            if (onGoHome) onGoHome();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="w-7 h-7 rounded-lg bg-violet/20 border border-violet/30 flex items-center justify-center group-hover:border-violet/60 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2" fill="var(--violet-light)" />
              <circle cx="6" cy="6" r="5" stroke="var(--violet-light)" strokeOpacity="0.4" />
            </svg>
          </div>
          <span className="font-display font-bold text-sm tracking-tight">DPDPA</span>
          <span className="mono text-[10px] text-t4">Engine</span>
        </a>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#interview"
            className="text-sm text-t3 hover:text-t1 transition-colors"
            style={{ cursor: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              if (onBeginAudit) onBeginAudit();
            }}
          >
            Interview
          </a>
          <a
            href="#report"
            className="text-sm text-t3 hover:text-t1 transition-colors"
            style={{ cursor: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              if (onViewReport) onViewReport();
            }}
          >
            Report
          </a>
        </nav>

        {/* CTA */}
        <button
          className="btn-ghost py-2 px-5 text-xs"
          onClick={onBeginAudit}
          style={{ cursor: 'none' }}
        >
          Begin Audit
        </button>
      </div>
    </motion.header>
  );
}
