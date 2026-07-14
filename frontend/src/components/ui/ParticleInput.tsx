import React, { useRef, useEffect } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function ParticleInput({
  value = '',
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const lastValueRef = useRef(value);

  // Spawns dust particles at the caret (cursor) position
  const spawnParticles = () => {
    if (!inputRef.current || !canvasRef.current || !containerRef.current) return;

    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Determine caret character index
    const selectionStart = input.selectionStart || 0;
    
    // Create a temporary span to measure the text width up to selectionStart
    const tempSpan = document.createElement('span');
    const computedStyle = window.getComputedStyle(input);
    
    // Mirror standard typography styles
    tempSpan.style.font = computedStyle.font;
    tempSpan.style.fontSize = computedStyle.fontSize;
    tempSpan.style.fontFamily = computedStyle.fontFamily;
    tempSpan.style.fontWeight = computedStyle.fontWeight;
    tempSpan.style.letterSpacing = computedStyle.letterSpacing;
    tempSpan.style.textTransform = computedStyle.textTransform;
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre';
    
    // Get text portion prior to caret
    const textBeforeCursor = String(value).substring(0, selectionStart);
    // Replace standard space with a non-breaking space for accurate sizing
    tempSpan.textContent = textBeforeCursor.replace(/ /g, '\u00a0');
    
    document.body.appendChild(tempSpan);
    const textWidth = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);

    // Coordinate math: container offset + padding + text width
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const scrollLeft = input.scrollLeft || 0;

    let x = rect.left - containerRect.left + paddingLeft + borderLeft + textWidth - scrollLeft;
    let y = rect.top - containerRect.top + rect.height / 2;

    // Clamp X coordinate inside the actual boundaries of the input text block
    const minX = rect.left - containerRect.left + paddingLeft;
    const maxX = rect.right - containerRect.left - paddingLeft;
    x = Math.max(minX, Math.min(x, maxX));

    // Soft, simple neutral palette (lavender, soft white, light gray)
    const colors = [
      '#a78bfa', // Lavender
      '#ffffff', // Pure white
      '#e2e8f0', // Soft gray
    ];

    // Spawn 12-16 soft, tiny dust particles
    const numParticles = 14;
    for (let i = 0; i < numParticles; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x,
        y: y + (Math.random() - 0.5) * 6, // tight vertical spread
        vx: (Math.random() - 0.5) * 0.5 - 0.25, // gentle horizontal drift
        vy: (Math.random() - 0.5) * 0.4 - 0.2, // gentle vertical spread
        size: 0.4 + Math.random() * 0.8, // extremely tiny sub-pixel dust grains
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        decay: 0.02 + Math.random() * 0.03, // smooth fade-out (250-400ms)
      });
    }
  };

  useEffect(() => {
    const currentStr = String(value);
    const lastStr = String(lastValueRef.current);
    // If text was deleted, trigger particles
    if (currentStr.length < lastStr.length) {
      spawnParticles();
    }
    lastValueRef.current = value;
  }, [value]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    let active = true;
    const update = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Physics update
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.015; // float gently upwards (like warm dust)
        p.vx *= 0.95;  // smooth deceleration drag
        p.vy *= 0.95;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw soft circular dust grain
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 2; // subtle soft glow
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      active = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center min-w-0 h-full">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{
          ...style,
          position: 'relative',
          zIndex: 2,
        }}
        {...props}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3 }}
      />
    </div>
  );
}
