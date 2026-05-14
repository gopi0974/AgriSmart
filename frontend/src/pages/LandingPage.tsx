import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Store, Leaf, Star, Zap, TrendingUp, ArrowRight, Sparkles, Globe } from 'lucide-react';

const VEGGIES = [
  { emoji: '🥦', color: '#22c55e' },
  { emoji: '🍅', color: '#ef4444' },
  { emoji: '🥕', color: '#f97316' },
  { emoji: '🧅', color: '#a855f7' },
  { emoji: '🌽', color: '#eab308' },
  { emoji: '🥬', color: '#10b981' },
  { emoji: '🫑', color: '#16a34a' },
  { emoji: '🍆', color: '#7c3aed' },
  { emoji: '🥒', color: '#059669' },
  { emoji: '🌶️', color: '#dc2626' },
];

const STATS = [
  { icon: TrendingUp, label: '200+ Farmers', sub: 'Registered', color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
  { icon: Zap,        label: 'AI Predictions', sub: 'Real-time ML', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { icon: Globe,      label: '13 Districts',   sub: 'Covered AP', color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  { icon: Star,       label: 'Live Map',       sub: 'Track Fresh Produce', color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden px-4 py-8">

      {/* ── Background neon orbs ───────────────────── */}
      <div className="orb orb-green w-[600px] h-[600px] -top-40 -left-40 animate-float-slow" />
      <div className="orb orb-blue  w-[500px] h-[500px] -bottom-20 -right-20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="orb orb-purple w-64 h-64 top-1/3 right-1/4" />
      <div className="orb orb-amber w-48 h-48 bottom-1/4 left-1/5" style={{ opacity: 0.12 }} />

      {/* ── Animated lattice / grid decoration ─── */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: `
          linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* ── Floating vegetable emojis ─────────────── */}
      {VEGGIES.map((veg, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{
            top: `${8 + (i * 9) % 75}%`,
            left: `${3 + (i * 11) % 92}%`,
            fontSize: `${1.6 + (i % 3) * 0.5}rem`,
            animation: `float ${3 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            opacity: 0.3 + (i % 3) * 0.08,
            filter: `drop-shadow(0 0 8px ${veg.color}80)`,
            transform: `rotate(${-20 + i * 8}deg)`,
          }}
        >
          {veg.emoji}
        </div>
      ))}

      {/* ── Hero Content ──────────────────────────── */}
      <div className="relative z-10 text-center max-w-4xl mx-auto animate-slide-up">

        {/* Animated badge */}
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 text-sm font-bold shimmer-line"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#86efac',
            boxShadow: '0 0 20px rgba(34,197,94,0.15)',
          }}
        >
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span>Andhra Pradesh's #1 AI Agri Platform</span>
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Central animated icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Spinning rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 crop-ring opacity-50" style={{ animationDuration: '12s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 crop-ring opacity-30" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
            </div>

            {/* Main icon */}
            <div
              className="relative w-24 h-24 rounded-3xl flex items-center justify-center animate-glow"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #059669, #065f46)',
                boxShadow: '0 0 40px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.2)',
              }}
            >
              <Leaf className="w-12 h-12 text-white" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }} />
            </div>

            {/* Orbit dots */}
            <div
              className="absolute w-4 h-4 bg-yellow-400 rounded-full"
              style={{
                top: '-4px', right: '-4px',
                boxShadow: '0 0 12px rgba(251,191,36,0.9)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              className="absolute w-3 h-3 bg-blue-400 rounded-full"
              style={{
                bottom: '0px', left: '-4px',
                boxShadow: '0 0 10px rgba(96,165,250,0.9)',
                animation: 'pulse 2s ease-in-out infinite 0.7s',
              }}
            />
            <div
              className="absolute w-2.5 h-2.5 bg-purple-400 rounded-full"
              style={{
                top: '50%', right: '-12px',
                boxShadow: '0 0 8px rgba(196,181,253,0.9)',
                animation: 'pulse 1.8s ease-in-out infinite 1.2s',
              }}
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight mb-6">
          <span className="text-white">Smart </span>
          <span className="gradient-text">Vegetable</span>
          <br />
          <span className="text-white">Market </span>
          <span className="gradient-text-gold">Platform</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-xl mx-auto mb-4 leading-relaxed" style={{ color: 'rgba(148,163,184,0.9)' }}>
          Connecting{' '}
          <strong style={{ color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.4)' }}>farmers</strong>
          {' '}&amp;{' '}
          <strong style={{ color: '#93c5fd', textShadow: '0 0 12px rgba(147,197,253,0.4)' }}>consumers</strong>
          {' '}across Andhra Pradesh with AI-driven price predictions and real-time availability.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 animate-slide-up delay-200">
          {STATS.map(({ icon: Icon, label, sub, color, glow }, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-default"
              style={{
                background: 'rgba(15,23,42,0.7)',
                border: `1px solid ${color}30`,
                color: '#e2e8f0',
                boxShadow: `0 0 12px ${glow}20`,
                animationDelay: `${i * 0.1 + 0.2}s`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${glow}50`;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${glow}20`;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
              }}
            >
              <Icon style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.75rem' }}>· {sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Login Cards ──────────────────────────────── */}
      <div className="relative z-10 grid sm:grid-cols-2 gap-6 w-full max-w-3xl animate-slide-up delay-300">

        {/* Farmer Card */}
        <Link
          to="/farmer/login"
          className="group relative flex flex-col items-center p-8 rounded-3xl overflow-hidden card-lift"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.2) 0%, rgba(5,150,105,0.15) 100%)',
            border: '1px solid rgba(34,197,94,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.05)',
            backdropFilter: 'blur(24px)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(34,197,94,0.5)';
            el.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(34,197,94,0.15)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(34,197,94,0.25)';
            el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.05)';
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            {['🌾', '🌱', '🌿'].map((e, i) => (
              <span key={i} className="absolute text-5xl" style={{ top: `${15 + i * 28}%`, left: `${5 + i * 32}%`, transform: `rotate(${-15 + i * 15}deg)` }}>{e}</span>
            ))}
          </div>

          {/* Glow bg on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.08), transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-400"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #059669)',
                boxShadow: '0 0 30px rgba(34,197,94,0.4)',
              }}
            >
              <Sprout className="w-10 h-10 text-white veg-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#86efac',
            }}>
              🌾 Farmer Portal
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Grow &amp; Sell</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.8)' }}>
              List your harvest, manage crop availability, and reach thousands of consumers directly.
            </p>

            <div
              className="mt-6 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 group-hover:gap-3 ripple-effect"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #059669)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
              }}
            >
              Login as Farmer <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Consumer Card */}
        <Link
          to="/consumer/login"
          className="group relative flex flex-col items-center p-8 rounded-3xl overflow-hidden card-lift"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(99,102,241,0.15) 100%)',
            border: '1px solid rgba(96,165,250,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.05)',
            backdropFilter: 'blur(24px)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(96,165,250,0.5)';
            el.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.15)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(96,165,250,0.25)';
            el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.05)';
          }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            {['🛒', '🏪', '💰'].map((e, i) => (
              <span key={i} className="absolute text-5xl" style={{ top: `${15 + i * 28}%`, left: `${5 + i * 32}%`, transform: `rotate(${-15 + i * 15}deg)` }}>{e}</span>
            ))}
          </div>

          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08), transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-400"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 0 30px rgba(59,130,246,0.4)',
              }}
            >
              <Store className="w-10 h-10 text-white veg-bounce" style={{ animationDelay: '0.6s' }} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
              color: '#93c5fd',
            }}>
              🛒 Consumer Portal
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Find &amp; Buy Fresh</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.8)' }}>
              Find fresh vegetables near you, check AI price predictions, and contact farmers directly.
            </p>

            <div
              className="mt-6 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 group-hover:gap-3 ripple-effect"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
              }}
            >
              Login as Consumer <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* Bottom ticker / note */}
      <p className="relative z-10 mt-10 text-xs animate-fade-in delay-600" style={{ color: 'rgba(100,116,139,0.8)' }}>
        Andhra Pradesh Agricultural Transparency Initiative · AI Price Model · Real-time Location Mapping
      </p>
    </div>
  );
}
