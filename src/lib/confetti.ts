const COLORS = ["#ff2d95", "#19e3ff", "#ffd23f", "#34e89e", "#ff7a35", "#b06bff"];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  s: number; c: string;
  rot: number; vr: number;
  life: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: Particle[] = [];
let raf: number | null = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.getElementById("confetti") as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function loop() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter(p => p.life > 0 && p.y < canvas!.height + 30);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.06;
    p.rot += p.vr; p.life--;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
    ctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop);
  else { raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

export function fireConfetti(n = 60) {
  ensureCanvas();
  if (!canvas) return;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * canvas.width, y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      s: Math.random() * 6 + 4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      life: 120,
    });
  }
  if (parts.length > 400) parts = parts.slice(-400);
  if (!raf) raf = requestAnimationFrame(loop);
}
