import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';

interface Props {
  /** Change this value to fire a new burst; null/undefined = idle. */
  burst: number | null;
  colors: readonly string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
}

/**
 * A dependency-free canvas confetti burst. Runs for ~2s at the display's
 * refresh rate and is skipped entirely under prefers-reduced-motion.
 */
export function Confetti({ burst, colors }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (burst === null || reduced || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    };
    resize();

    const W = canvas.width;
    const H = canvas.height;
    const count = Math.min(180, Math.floor(W / 6));
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = (6 + Math.random() * 9) * dpr;
      return {
        x: W / 2 + (Math.random() - 0.5) * W * 0.3,
        y: H * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: (6 + Math.random() * 6) * dpr,
        h: (3 + Math.random() * 4) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        life: 1,
      };
    });

    let raf = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.35 * dpr * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life = Math.max(0, 1 - (now - start) / 2200);
        if (p.y < H + 20 && p.life > 0) alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };
  }, [burst, colors, reduced]);

  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
