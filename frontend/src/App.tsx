/**
 * App — State-based view router
 * 3 distinct "windows": home scroll | interview window | report window
 * AnimatePresence handles cinematic transitions between them
 */

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import Scene from './webgl/Scene';
import Nav from './components/layout/Nav';
import Hero from './components/sections/Hero';
import Interview from './components/sections/Interview';
import CommandCenter from './components/sections/CommandCenter';
import CursorFX from './components/cursor/CursorFX';
import { useAppStore } from './store/appStore';

type View = 'home' | 'interview' | 'report';

export default function App() {
  const [view, setView]       = useState<View>('home');
  const lenisRef              = useRef<Lenis | null>(null);
  const setAIState            = useAppStore((s) => s.setAIState);
  const addSession            = useAppStore((s) => s.addChatSession);
  const resetAudit            = useAppStore((s) => s.resetAudit);

  // Lenis smooth scroll — only active on home view
  useEffect(() => {
    if (view !== 'home') {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [view]);

  function goToInterview() {
    resetAudit();
    addSession("Active Audit", "pending");
    setAIState('idle');
    setView('interview');
    window.scrollTo(0, 0);
  }

  function goToReport() {
    setView('report');
    window.scrollTo(0, 0);
  }

  function goHome() {
    setView('home');
    window.scrollTo(0, 0);
  }

  function resumeInterview() {
    setView('interview');
    window.scrollTo(0, 0);
  }

  return (
    <div className="relative w-full" style={{ background: '#03030a' }}>
      {/* Custom cursor — always on top */}
      <CursorFX />

      {/* Fixed WebGL canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Scene />
      </div>

      {/* Navigation — hidden in app windows (they have their own headers) */}
      {view === 'home' && <Nav onBeginAudit={goToInterview} onViewReport={goToReport} onGoHome={goHome} />}

      {/* View switcher */}
      <div className="relative w-full h-full">
        <div style={{ display: view === 'home' ? 'block' : 'none' }} className="relative z-10 w-full">
          <Hero onBeginAudit={goToInterview} />
        </div>

        <div style={{ display: view === 'interview' ? 'block' : 'none' }} className="relative z-10 h-screen overflow-hidden">
          <Interview onViewReport={goToReport} onGoHome={goHome} />
        </div>

        <div style={{ display: view === 'report' ? 'block' : 'none' }} className="relative z-10 h-screen overflow-hidden">
          <CommandCenter onBack={resumeInterview} />
        </div>
      </div>
    </div>
  );
}
