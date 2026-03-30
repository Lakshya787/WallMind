import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ScanLine, Cpu, Box, BarChart3, Sparkles, Shield, ChevronRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   HOUSE TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════ */
const HOUSE_TYPES = [
  {
    name: 'Classic Cottage',
    tag: 'Residential',
    tagColor: '#3b82f6',
    wallColor:  () => `hsl(${15 + Math.random() * 6}, ${52 + Math.random() * 10}%, ${38 + Math.random() * 8}%)`,
    roofColor:  () => `hsl(${210 + Math.random() * 10}, ${35 + Math.random() * 8}%, ${28 + Math.random() * 6}%)`,
    getLayout: () => ({
      COLS: 13, WALL_ROWS: 6,
      roofRows: [[6,6],[5,7],[4,8],[3,9],[2,10],[1,11]],
      windows: new Set([
        '2,2','3,2','2,3','3,3',
        '9,2','10,2','9,3','10,3',
        '6,4','6,5','7,4','7,5',
      ]),
    }),
  },
  {
    name: 'Modern Villa',
    tag: 'Contemporary',
    tagColor: '#10b981',
    wallColor:  () => `hsl(${200 + Math.random() * 10}, ${18 + Math.random() * 8}%, ${52 + Math.random() * 8}%)`,
    roofColor:  () => `hsl(0, 0%, ${22 + Math.random() * 6}%)`,
    getLayout: () => ({
      COLS: 16, WALL_ROWS: 5,
      roofRows: [[0,15],[1,14]],
      windows: new Set([
        '1,1','2,1','3,1','4,1',
        '10,1','11,1','12,1','13,1',
        '7,3','8,3','7,4','8,4',
        '1,3','2,3',
        '13,3','14,3',
      ]),
    }),
  },
  {
    name: 'Tall Townhouse',
    tag: 'Urban',
    tagColor: '#8b5cf6',
    wallColor:  () => `hsl(${22 + Math.random() * 8}, ${40 + Math.random() * 10}%, ${34 + Math.random() * 8}%)`,
    roofColor:  () => `hsl(${200 + Math.random() * 15}, ${30 + Math.random() * 8}%, ${20 + Math.random() * 6}%)`,
    getLayout: () => ({
      COLS: 10, WALL_ROWS: 10,
      roofRows: [[4,5],[3,6],[2,7],[1,8]],
      windows: new Set([
        '2,1','3,1','2,2','3,2',
        '6,1','7,1','6,2','7,2',
        '2,4','3,4','2,5','3,5',
        '6,4','7,4','6,5','7,5',
        '2,7','3,7','2,8','3,8',
        '4,8','4,9','5,8','5,9',
      ]),
    }),
  },
];

/* ═══════════════════════════════════════════════════════════════════
   CANVAS ANIMATION
═══════════════════════════════════════════════════════════════════ */
function BrickHouseCanvas({ onHouseChange }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = canvas.offsetWidth  || 600;
    let H = canvas.offsetHeight || 440;
    canvas.width  = W;
    canvas.height = H;

    const BW = 26, BH = 13, GAP = 2;
    const STEP  = BW + GAP;
    const VSTEP = BH + GAP;

    // ── Physics constants ────────────────────────────────────
    const GRAVITY  = 2400;   // px/s²
    const DAMPING  = 0.30;
    const HOLD_DUR    = 2.4; // seconds to show completed house
    const CRUMBLE_DUR = 1.6; // seconds for crumble-out

    // ── State ────────────────────────────────────────────────
    let phase      = 'build';  // 'build' | 'hold' | 'crumble'
    let phaseTimer = 0;
    let buildStart = null;

    let houseIdx = Math.floor(Math.random() * HOUSE_TYPES.length);
    let nextIdx  = null;
    let bricks   = [];
    let particles = [];

    onHouseChange && onHouseChange(houseIdx);

    // ── Helpers ──────────────────────────────────────────────
    function pickNext(cur) {
      let n;
      do { n = Math.floor(Math.random() * HOUSE_TYPES.length); } while (n === cur);
      return n;
    }

    function spawnDust(x, y, color) {
      for (let i = 0; i < 5; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 80,
          vy: -(Math.random() * 55 + 12),
          life: 1,
          size: Math.random() * 3 + 1,
          color: color || '#c0855a',
        });
      }
    }

    function buildHouse(idx) {
      const type = HOUSE_TYPES[idx];
      const { COLS, WALL_ROWS, roofRows, windows } = type.getLayout();

      const totalW = COLS * STEP - GAP;
      const roofH  = roofRows.length * VSTEP;
      const wallH  = WALL_ROWS * VSTEP - GAP;

      const ox = (W - totalW) / 2;
      const oy = H - wallH - roofH - 20;

      const list = [];

      // Roof (arrives later)
      roofRows.forEach(([c0, c1], ri) => {
        for (let col = c0; col <= c1; col++) {
          const tx = ox + col * STEP;
          const ty = oy + ri * VSTEP;
          const sx = tx + (Math.random() - 0.5) * W * 0.9;
          const sy = -BH - Math.random() * H * 1.1;
          list.push({
            cx: sx, cy: sy, tx, ty,
            vx: (Math.random() - 0.5) * 3,
            vy: 0,
            delay: 1.7 + Math.random() * 1.0,
            landed: false,
            alpha: 1,
            isRoof: true,
            isWin: false,
            color: type.roofColor(),
          });
        }
      });

      // Wall + windows
      for (let row = 0; row < WALL_ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const key = `${col},${row}`;
          const isWin = windows.has(key);
          const tx = ox + col * STEP;
          const ty = oy + roofH + row * VSTEP;
          const sx = tx + (Math.random() - 0.5) * W * 1.0;
          const sy = -BH - Math.random() * H * 1.3;
          list.push({
            cx: sx, cy: sy, tx, ty,
            vx: (Math.random() - 0.5) * 3,
            vy: 0,
            delay: Math.random() * 2.0,
            landed: false,
            alpha: 1,
            isRoof: false,
            isWin,
            color: isWin ? null : type.wallColor(),
          });
        }
      }

      return list;
    }

    // ── Draw single brick ────────────────────────────────────
    function drawBrick(b, overrideAlpha) {
      const a = overrideAlpha !== undefined ? overrideAlpha : b.alpha;
      if (a <= 0) return;
      ctx.globalAlpha = a;

      const bx = Math.round(b.cx);
      const by = Math.round(b.cy);

      if (b.isWin) {
        ctx.fillStyle = '#0b1a30';
        ctx.fillRect(bx, by, BW, BH);
        ctx.fillStyle = 'rgba(96,180,255,0.22)';
        ctx.fillRect(bx + 2, by + 2, BW / 2 - 3, BH - 4);
        ctx.fillStyle = 'rgba(96,180,255,0.12)';
        ctx.fillRect(bx + BW / 2 + 1, by + 2, BW / 2 - 3, BH - 4);
        ctx.strokeStyle = '#163d6a';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx + 0.5, by + 0.5, BW - 1, BH - 1);
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, by, BW, BH);
        // Highlight + shadow
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.fillRect(bx, by, BW, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(bx, by + BH - 2, BW, 2);
        // Mortar
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx + 0.5, by + 0.5, BW - 1, BH - 1);
      }
      ctx.globalAlpha = 1;
    }

    // ── Initial build ────────────────────────────────────────
    bricks = buildHouse(houseIdx);

    // ── MAIN LOOP ────────────────────────────────────────────
    let lastTs = null;
    let animId;

    function loop(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      ctx.clearRect(0, 0, W, H);

      /* ── BUILD ── */
      if (phase === 'build') {
        if (buildStart === null) buildStart = ts;
        const elapsed = (ts - buildStart) / 1000;
        let allLanded = true;

        for (const b of bricks) {
          const t = elapsed - b.delay;
          if (t < 0) { allLanded = false; continue; }

          if (!b.landed) {
            allLanded = false;
            b.vy += GRAVITY * dt;
            b.cy += b.vy * dt;
            b.cx += b.vx * dt * 28;

            if (b.cy >= b.ty) {
              b.cy = b.ty;
              b.vy *= -DAMPING;
              b.vx *= 0.45;
              if (Math.abs(b.vy) < 2.5) {
                b.landed = true;
                b.cx = b.tx;
                b.cy = b.ty;
                spawnDust(b.cx + BW / 2, b.cy + BH, b.color);
              }
            }
            // Horizontal snap
            b.cx += (b.tx - b.cx) * 0.07;
          }

          drawBrick(b);
        }

        if (allLanded) {
          phase = 'hold';
          phaseTimer = 0;
          nextIdx = pickNext(houseIdx);
        }

      /* ── HOLD ── */
      } else if (phase === 'hold') {
        for (const b of bricks) drawBrick(b);
        phaseTimer += dt;
        if (phaseTimer >= HOLD_DUR) {
          phase = 'crumble';
          phaseTimer = 0;
          // Assign crumble velocities
          for (const b of bricks) {
            b._cvx = (Math.random() - 0.5) * 160;
            b._cvy = -(Math.random() * 60 + 15);
          }
        }

      /* ── CRUMBLE ── */
      } else if (phase === 'crumble') {
        phaseTimer += dt;
        const globalProg = Math.min(phaseTimer / CRUMBLE_DUR, 1);

        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];
          // Stagger: bricks near top / random fall first
          const localProg = Math.min(
            Math.max((globalProg - (i / bricks.length) * 0.25) / 0.75, 0), 1
          );
          if (localProg <= 0) { drawBrick(b); continue; }

          b._cvy += 1900 * dt * localProg;
          b.cx   += b._cvx * dt * localProg * 0.5;
          b.cy   += b._cvy * dt * localProg * 0.5;

          const alpha = 1 - Math.pow(localProg, 1.6);
          drawBrick(b, alpha);
        }

        if (phaseTimer >= CRUMBLE_DUR) {
          houseIdx = nextIdx;
          bricks   = buildHouse(houseIdx);
          particles = [];
          buildStart = null;
          phase = 'build';
          onHouseChange && onHouseChange(houseIdx);
        }
      }

      /* ── DUST PARTICLES ── */
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x   += p.vx * dt;
        p.y   += p.vy * dt;
        p.vy  += 130 * dt;
        p.life -= 0.032;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.45;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      W = canvas.offsetWidth  || 600;
      H = canvas.offsetHeight || 440;
      canvas.width  = W;
      canvas.height = H;
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />;
}

/* ═══════════════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════════════ */
const PIPELINE = [
  { step: '01', title: 'Floor Plan Parsing',       desc: 'Upload any 2D floor plan. Our engine detects walls, rooms, and openings using advanced image analysis.',                              icon: ScanLine,  color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
  { step: '02', title: 'Geometry Reconstruction',  desc: 'Detected geometries are converted into a structural graph — classifying load-bearing vs. partition elements.',                         icon: Cpu,       color: '#6366f1', glow: 'rgba(99,102,241,0.15)' },
  { step: '03', title: '2D → 3D Generation',       desc: 'Walls are extruded to standard height. An interactive 3D model loads instantly in your browser via Three.js.',                        icon: Box,       color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
  { step: '04', title: 'Material Recommendations', desc: 'Every wall gets ranked materials (RCC, Steel, AAC, Fly Ash Brick) scored on strength, durability, and cost.',                         icon: BarChart3, color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
];

const STATS = [
  { value: '5',    unit: 'Stage', label: 'Pipeline' },
  { value: '3m',   unit: 'Wall',  label: 'Height Standard' },
  { value: '100%', unit: 'Rule',  label: 'Based Logic' },
  { value: '<3s',  unit: 'Parse', label: 'Time Target' },
];

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const { user } = useAuth();
  const [activeHouse, setActiveHouse] = useState(0);
  const house = HOUSE_TYPES[activeHouse];

  return (
    <div className="flex flex-col font-sans text-slate-200 relative w-full overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;700;900&display=swap');

        @keyframes fadeInUp  { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes floatBrick{ 0%,100% { transform: translateY(0px) rotate(var(--r,0deg)) } 50% { transform: translateY(-16px) rotate(var(--r,0deg)) } }
        @keyframes shimmer   { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,.55) } 70% { box-shadow: 0 0 0 14px rgba(99,102,241,0) } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0) } }
        @keyframes tagSwap   { 0% { opacity: 0; transform: translateY(7px) } 100% { opacity: 1; transform: translateY(0) } }
        @keyframes blink     { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
        @keyframes dotPop    { 0% { transform: scale(1) } 50% { transform: scale(1.5) } 100% { transform: scale(1) } }

        .fade-up       { animation: fadeInUp .7s cubic-bezier(.22,1,.36,1) both }
        .fade-in       { animation: fadeIn .8s ease both }
        .float-brick   { animation: floatBrick 4s ease-in-out infinite }
        .shimmer-text  { background: linear-gradient(90deg,#94a3b8 0%,#e2e8f0 40%,#94a3b8 60%,#e2e8f0 100%); background-size: 200% auto; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite }
        .gradient-text { background: linear-gradient(135deg,#60a5fa 0%,#818cf8 50%,#c084fc 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent }
        .glass-card    { background: rgba(15,23,42,.6); backdrop-filter: blur(12px) }
        .glass-card:hover { background: rgba(20,30,55,.75) }
        .hero-cta      { animation: pulseRing 2.5s ease-out infinite }
        .tag-anim      { animation: tagSwap .45s cubic-bezier(.22,1,.36,1) both }
        .dot-blink     { animation: blink 1.4s ease-in-out infinite }
        .pipeline-card { transition: all .35s cubic-bezier(.22,1,.36,1) }
        .pipeline-card:hover { transform: translateY(-4px) scale(1.01); border-color: rgba(99,102,241,.5) !important }
      `}</style>

      <main className="relative z-10 w-full">
        {/* Grid bg */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Ambient glows */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(59,130,246,.07) 0%,transparent 70%)' }} />
          <div className="absolute top-[20%] right-[-5%] w-[35vw] h-[35vw] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 70%)' }} />
        </div>

        {/* Decorative floating bricks */}
        {[
          { top: '10%', left: '5%',   r: '-12deg', delay: '0s',   w: 38, h: 18 },
          { top: '22%', left: '2%',   r: '5deg',   delay: '0.8s', w: 26, h: 12 },
          { top: '7%',  right: '6%',  r: '15deg',  delay: '1.2s', w: 40, h: 18 },
          { top: '30%', right: '3%',  r: '-6deg',  delay: '0.3s', w: 28, h: 13 },
          { top: '48%', left: '1.5%', r: '8deg',   delay: '1.8s', w: 34, h: 15 },
          { top: '52%', right: '2%',  r: '-14deg', delay: '0.6s', w: 30, h: 13 },
        ].map((b, i) => (
          <div key={i} className="absolute float-brick" style={{
            top: b.top, left: b.left, right: b.right,
            '--r': b.r,
            animationDelay: b.delay,
            animationDuration: `${3.5 + i * 0.4}s`,
            width: b.w, height: b.h, borderRadius: 3, opacity: .13,
            background: `linear-gradient(135deg,hsl(${18+i*5},55%,${42+i*2}%) 0%,hsl(${15+i*3},48%,32%) 100%)`,
            border: '1px solid rgba(200,120,80,.3)',
          }} />
        ))}

        {/* ── HERO ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-0 sm:pt-28 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" style={{ minHeight: '88vh' }}>

            {/* LEFT: Text */}
            <div className="flex flex-col items-start text-left">
              <div className="fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-sm font-semibold"
                style={{ animationDelay: '.1s', background: 'linear-gradient(135deg,rgba(59,130,246,.12),rgba(139,92,246,.12))', border: '1px solid rgba(99,102,241,.3)', color: '#a5b4fc' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                Autonomous Structural Intelligence
              </div>

              <h1 className="fade-up text-5xl sm:text-6xl xl:text-7xl font-black tracking-tighter leading-[1.04] text-white mb-6"
                style={{ animationDelay: '.15s', fontFamily: "'DM Sans',sans-serif" }}>
                Turn Floor Plans<br />
                into <span className="gradient-text">3D Models</span><br />
                <span className="shimmer-text">Instantly.</span>
              </h1>

              <p className="fade-up text-lg text-slate-400 max-w-lg leading-relaxed font-light mb-10"
                style={{ animationDelay: '.25s' }}>
                WallMind reads a 2D floor plan image, reconstructs it as a structured 3D model, and recommends optimal construction materials —{' '}
                <span style={{ color: '#93c5fd' }}>no AI hallucinations.</span>
              </p>

              <div className="fade-up flex flex-col sm:flex-row gap-4 mb-12" style={{ animationDelay: '.35s' }}>
                <Link to={user ? '/dashboard' : '/signup'}
                  className="hero-cta relative inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full text-white group transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)', boxShadow: '0 0 30px rgba(99,102,241,.4)' }}>
                  <span className="relative flex items-center gap-2">
                    {user ? 'Go to Dashboard' : 'Analyze a Floor Plan'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <a href="#pipeline"
                  className="inline-flex items-center justify-center px-8 py-4 border text-base font-medium rounded-full text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                  style={{ borderColor: 'rgba(99,102,241,.25)', background: 'rgba(15,23,42,.5)' }}>
                  See how it works
                </a>
              </div>

              <div className="fade-up grid grid-cols-2 sm:grid-cols-4 gap-3 w-full" style={{ animationDelay: '.45s' }}>
                {STATS.map((s, i) => (
                  <div key={s.label} className="rounded-xl px-4 py-3 text-center"
                    style={{ background: 'rgba(15,23,42,.7)', border: '1px solid rgba(99,102,241,.15)' }}>
                    <div className="text-xl font-black text-white">{s.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{s.unit} · {s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Canvas */}
            <div className="fade-in relative flex flex-col items-center justify-end" style={{ animationDelay: '.2s' }}>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 440,
                background: 'linear-gradient(180deg,rgba(6,10,24,.88) 0%,rgba(10,16,36,.97) 100%)',
                border: '1px solid rgba(99,102,241,.2)',
                boxShadow: '0 0 60px rgba(59,130,246,.1),inset 0 0 80px rgba(0,0,0,.4)',
              }}>
                <BrickHouseCanvas onHouseChange={setActiveHouse} />

                {/* Ground line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,.45),transparent)' }} />

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3"
                  style={{ background: 'linear-gradient(180deg,rgba(6,10,24,.9) 0%,transparent 100%)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full dot-blink" style={{ background: '#4ade80' }} />
                    <span className="text-xs font-mono text-slate-400">LIVE BUILD</span>
                  </div>
                  {/* Phase dots */}
                  <div className="flex items-center gap-2">
                    {HOUSE_TYPES.map((t, i) => (
                      <div key={i} className="rounded-full transition-all duration-500"
                        style={{
                          width: i === activeHouse ? 8 : 6,
                          height: i === activeHouse ? 8 : 6,
                          background: i === activeHouse ? t.tagColor : 'rgba(100,116,139,.3)',
                          boxShadow: i === activeHouse ? `0 0 8px ${t.tagColor}` : 'none',
                        }} />
                    ))}
                  </div>
                </div>

                {/* House type tag */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                  <div key={activeHouse} className="tag-anim flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                    style={{ background: 'rgba(8,14,32,.88)', border: `1px solid ${house.tagColor}45`, backdropFilter: 'blur(8px)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: house.tagColor }} />
                    <span className="text-xs font-bold tracking-wider" style={{ color: house.tagColor }}>{house.tag.toUpperCase()}</span>
                    <span className="text-xs text-slate-400 font-medium">{house.name}</span>
                  </div>
                </div>
              </div>

              {/* House legend below canvas */}
              <div className="flex justify-center gap-5 mt-4">
                {HOUSE_TYPES.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 transition-all duration-400"
                    style={{ opacity: i === activeHouse ? 1 : 0.32 }}>
                    <div className="rounded-full transition-all duration-400"
                      style={{
                        width: i === activeHouse ? 8 : 6,
                        height: i === activeHouse ? 8 : 6,
                        background: t.tagColor,
                        boxShadow: i === activeHouse ? `0 0 6px ${t.tagColor}` : 'none',
                      }} />
                    <span className="text-[11px] font-medium text-slate-400">{t.name}</span>
                  </div>
                ))}
              </div>

              {/* Floating chips (desktop only) */}
              <div className="absolute -left-5 top-[28%] px-3 py-2 rounded-xl text-xs font-semibold hidden xl:block"
                style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', color: '#6ee7b7', boxShadow: '0 0 20px rgba(16,185,129,.1)' }}>
                ✓ Load-bearing detected
              </div>
              <div className="absolute -right-5 top-[54%] px-3 py-2 rounded-xl text-xs font-semibold hidden xl:block"
                style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)', color: '#93c5fd', boxShadow: '0 0 20px rgba(59,130,246,.1)' }}>
                3D model ready →
              </div>
            </div>

          </div>
        </div>

        {/* ── PIPELINE ── */}
        <div id="pipeline" className="relative w-full py-28 mt-16"
          style={{ background: 'linear-gradient(180deg,transparent 0%,rgba(10,15,35,.85) 30%,rgba(10,15,35,.92) 100%)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', color: '#818cf8' }}>
                How It Works
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>
                The 5-Stage Pipeline
              </h2>
              <p className="text-lg text-slate-400 font-light max-w-xl mx-auto">
                From image to intelligent 3D model — deterministic, transparent, and fast.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PIPELINE.map(({ step, title, desc, icon: Icon, color, glow }) => (
                <div key={step} className="pipeline-card glass-card p-7 rounded-2xl"
                  style={{ border: '1px solid rgba(99,102,241,.15)' }}>
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: glow, border: `1px solid ${color}40`, boxShadow: `0 0 24px ${glow}` }}>
                      <Icon style={{ color }} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="mb-1.5">
                        <span className="text-[10px] font-black tracking-[.2em] uppercase px-2 py-0.5 rounded"
                          style={{ color, background: `${color}15` }}>Stage {step}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── WHY WALLMIND ── */}
        <div className="w-full py-28" style={{ borderTop: '1px solid rgba(99,102,241,.08)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4"
                style={{ fontFamily: "'DM Sans',sans-serif" }}>
                Built for Engineers,<br />Architects & Builders
              </h2>
              <p className="text-lg text-slate-400 font-light max-w-xl mx-auto">
                No hallucinations. No black-box AI. Pure deterministic geometry + rule-based material logic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Shield,    title: 'Structural Integrity Checks', desc: 'Flag potential load-bearing issues, unsupported spans, and structural anomalies automatically.', color: '#f59e0b' },
                { icon: BarChart3, title: 'Cost–Strength Tradeoff',      desc: 'Every material ranked on a formula: Score = Strength + Durability − Cost. Total transparency.', color: '#10b981' },
                { icon: Box,       title: 'Interactive 3D Viewer',       desc: 'Orbit, zoom, and inspect every wall. Toggle rooms, doors, and windows independently.',          color: '#6366f1' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="glass-card p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ border: '1px solid rgba(99,102,241,.12)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="w-full py-24" style={{ borderTop: '1px solid rgba(99,102,241,.08)' }}>
          <div className="max-w-3xl mx-auto text-center px-4">
            <div className="flex justify-center gap-1.5 mb-10 opacity-25">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="rounded-sm"
                  style={{ width: 26, height: 13, background: `hsl(${14+(i%3)*5},50%,${36+(i%4)*4}%)`, border: '1px solid rgba(0,0,0,.3)', transform: `translateY(${i%2===0?0:3}px)` }} />
              ))}
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4"
              style={{ fontFamily: "'DM Sans',sans-serif" }}>
              Ready to analyze<br />your first plan?
            </h2>
            <p className="text-slate-400 mb-10 font-light text-lg">
              Upload a floor plan image and get a full 3D structural report in under 3 seconds.
            </p>
            <Link to={user ? '/upload' : '/signup'}
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-white font-bold text-lg transition-all duration-300 hover:-translate-y-1 group"
              style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)', boxShadow: '0 0 40px rgba(99,102,241,.45)' }}>
              {user ? 'New Analysis' : 'Get Started Free'}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}