/**
 * CursorFX — Fixed: visible cursor with dark shadow halo
 * Works on both dark backgrounds AND bright particle fields
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; hue: number;
}

export default function CursorFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor    = useRef({ x: -300, y: -300 });
  const target    = useRef({ x: -300, y: -300 });
  const velocity  = useRef({ x: 0, y: 0 });
  const particles = useRef<Particle[]>([]);
  const rafId     = useRef(0);

  const getHue = useCallback(() => {
    switch (useAppStore.getState().aiState) {
      case 'thinking':   return 265;
      case 'excited':    return 185;
      case 'responding': return 210;
      default:           return 255;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      if (canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    function emit(x: number, y: number, speed: number) {
      const hue   = getHue();
      const count = Math.min(Math.ceil(speed * 0.3), 5);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mag   = Math.random() * speed * 0.35;
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag - 0.3,
          life: 1,
          maxLife: 0.4 + Math.random() * 0.4,
          size: 1 + Math.random() * 2.5,
          hue,
        });
      }
      if (particles.current.length > 200) {
        particles.current.splice(0, particles.current.length - 200);
      }
    }

    function loop() {
      if (canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Spring physics
      const dx = target.current.x - cursor.current.x;
      const dy = target.current.y - cursor.current.y;
      velocity.current.x += dx * 0.16;
      velocity.current.y += dy * 0.16;
      velocity.current.x *= 0.78;
      velocity.current.y *= 0.78;
      cursor.current.x   += velocity.current.x;
      cursor.current.y   += velocity.current.y;

      const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.y ** 2);
      if (speed > 1.5) emit(cursor.current.x, cursor.current.y, speed);

      // ── Particle trail ─────────────────────────────────
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const p of particles.current) {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.035;
        p.vx  *= 0.93;
        p.vy  *= 0.93;
        p.life -= 0.03 / p.maxLife;

        const a = Math.max(0, p.life) * 0.7;
        const r = Math.max(0.1, p.size * p.life);
        if (r < 0.1) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 75%, 72%, ${a})`;
        ctx.fill();
      }

      // ── Cursor ring — dark shadow makes it visible everywhere ──
      const hue  = getHue();
      const cx   = cursor.current.x;
      const cy   = cursor.current.y;
      const tx   = target.current.x;
      const ty   = target.current.y;
      const ring = 14 + speed * 0.08;

      // Dark shadow ring (visibility on bright backgrounds)
      ctx.save();
      ctx.shadowColor  = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur   = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.85)`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();

      // White inner filled dot at exact mouse position
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      rafId.current = requestAnimationFrame(loop);
    }

    loop();
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [getHue]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
}
