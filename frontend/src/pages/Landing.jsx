import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, ScanLine, Cpu, Box, BarChart3, Sparkles, Shield, ChevronRight } from 'lucide-react';

const PIPELINE = [
  {
    step: '01',
    title: 'Floor Plan Parsing',
    desc: 'Upload any 2D floor plan. Our engine detects walls, rooms, and openings using advanced image analysis.',
    icon: ScanLine,
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    step: '02',
    title: 'Geometry Reconstruction',
    desc: 'Detected geometries are converted into a structural graph — classifying load-bearing vs. partition elements.',
    icon: Cpu,
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    step: '03',
    title: '2D → 3D Generation',
    desc: 'Walls are extruded to standard height. An interactive 3D model loads instantly in your browser via Three.js.',
    icon: Box,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    step: '04',
    title: 'Material Recommendations',
    desc: 'Every wall gets ranked materials (RCC, Steel, AAC, Fly Ash Brick) scored on strength, durability, and cost.',
    icon: BarChart3,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
  },
];

const STATS = [
  { value: '5',    unit: 'Stage',  label: 'Pipeline' },
  { value: '3m',   unit: 'Wall',   label: 'Height Standard' },
  { value: '100%', unit: 'Rule',   label: 'Based Logic' },
  { value: '<3s',  unit: 'Parse',  label: 'Time Target' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col font-sans text-slate-200 relative w-full">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <main className="relative z-10 w-full">
        {/* Animated blobs */}
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[25%] w-[28vw] h-[28vw] rounded-full bg-blue-600/8 filter blur-[120px] animate-blob" />
          <div className="absolute top-[30%] right-[15%] w-[22vw] h-[22vw] rounded-full bg-indigo-600/8 filter blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[5%] left-[35%] w-[32vw] h-[32vw] rounded-full bg-purple-600/8 filter blur-[120px] animate-blob" style={{ animationDelay: '4s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-36 text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous Structural Intelligence
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-[1.05] animate-fade-in-up max-w-4xl" style={{ animationDelay: '0.1s' }}>
            Floor Plan to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              3D Model
            </span>
            <br />in seconds
          </h1>

          <p className="mt-7 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            WallMind reads a 2D floor plan image, reconstructs it as a structured 3D model, and recommends optimal construction materials — all without AI hallucinations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-full text-white overflow-hidden group shadow-[0_0_25px_rgba(79,70,229,0.3)] hover:shadow-[0_0_45px_rgba(79,70,229,0.55)] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all" />
              <span className="relative flex items-center gap-2">
                {user ? 'Go to Dashboard' : 'Analyze a Floor Plan'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a
              href="#pipeline"
              className="inline-flex items-center justify-center px-8 py-4 border border-slate-700 text-base font-medium rounded-full text-slate-300 bg-slate-800/30 hover:bg-slate-800 hover:text-white transition-all duration-300 transform hover:-translate-y-0.5"
            >
              See how it works
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {STATS.map(s => (
              <div key={s.label} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-center">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.unit} <span className="text-slate-600">·</span> {s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5-Stage Pipeline ──────────────────────────────── */}
        <div id="pipeline" className="w-full py-24 sm:py-28 bg-slate-900/40 border-t border-slate-800/40 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">The 5-Stage Pipeline</h2>
              <p className="mt-4 text-lg text-slate-400 font-light">From image to intelligent 3D model — deterministic, transparent, and fast.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PIPELINE.map(({ step, title, desc, icon: Icon, color, glow }) => (
                <div
                  key={step}
                  className="group glass-card p-7 rounded-2xl border border-slate-700/50 hover:border-opacity-80 transition-all duration-400 transform hover:-translate-y-1"
                  style={{ '--hover-border': color }}
                >
                  <div className="flex items-start gap-5">
                    <div style={{ background: glow, border: `1px solid ${color}30`, boxShadow: `0 0 20px ${glow}` }}
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon style={{ color }} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold tracking-widest" style={{ color }}>STAGE {step}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Why WallMind ──────────────────────────────────── */}
        <div className="w-full py-24 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Built for Engineers, Architects & Builders</h2>
              <p className="mt-4 text-lg text-slate-400 font-light max-w-2xl mx-auto">
                No hallucinations. No black-box AI. Pure deterministic geometry + rule-based material logic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: 'Structural Integrity Checks', desc: 'Flag potential load-bearing issues, unsupported spans, and structural anomalies automatically.', color: '#f59e0b' },
                { icon: BarChart3, title: 'Cost–Strength Tradeoff', desc: 'Every material ranked on a formula: Score = Strength + Durability − Cost. Total transparency.', color: '#10b981' },
                { icon: Box, title: 'Interactive 3D Viewer', desc: 'Orbit, zoom, and inspect every wall. Toggle rooms, doors, and windows independently.', color: '#6366f1' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="glass-card p-7 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <div className="w-full py-20 border-t border-slate-800/40">
          <div className="max-w-2xl mx-auto text-center px-4">
            <h2 className="text-3xl font-extrabold text-white mb-4">Ready to analyze your first plan?</h2>
            <p className="text-slate-400 mb-8 font-light">Upload a floor plan image and get a full 3D structural report in under 3 seconds.</p>
            <Link
              to={user ? '/upload' : '/signup'}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] transition-all transform hover:-translate-y-0.5"
            >
              {user ? 'New Analysis' : 'Get Started Free'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
