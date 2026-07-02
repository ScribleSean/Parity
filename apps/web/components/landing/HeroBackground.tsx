'use client';

import { useEffect, useRef } from 'react';

/** Animated probability curves — soft ambient motion behind the hero. */
export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const curves = Array.from({ length: 5 }, (_, i) => ({
      offset: i * 1.2,
      speed: 0.003 + i * 0.0008,
      amplitude: 40 + i * 12,
      yBase: 0.25 + i * 0.12,
      color: i % 2 === 0 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(34, 197, 94, 0.06)',
    }));

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const c of curves) {
        ctx.beginPath();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= canvas.width; x += 3) {
          const t = x * 0.004 + frame * c.speed + c.offset;
          const y =
            canvas.height * c.yBase +
            Math.sin(t) * c.amplitude +
            Math.sin(t * 2.3 + 1) * (c.amplitude * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Soft grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      for (let x = 0; x < canvas.width; x += 48) {
        for (let y = 0; y < canvas.height; y += 48) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.9,
      }}
    />
  );
}
