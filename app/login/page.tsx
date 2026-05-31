'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/useAuth'
import { LOADING_PHRASES } from '../../lib/loadingPhrases'

// ─── Arte SVG do mundo de Valdrak ───────────────────────────────────────────

function ValdrakArt() {
  return (
    <svg
      viewBox="0 0 700 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#03020a" />
          <stop offset="35%"  stopColor="#0a0618" />
          <stop offset="70%"  stopColor="#130a22" />
          <stop offset="100%" stopColor="#1c0d2e" />
        </linearGradient>
        {/* Horizon fog gradient */}
        <linearGradient id="fogHorizon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a1540" stopOpacity="0" />
          <stop offset="60%"  stopColor="#1a0d2e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0d0618" stopOpacity="0.9" />
        </linearGradient>
        {/* Tavern warm glow */}
        <radialGradient id="tavernGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.55" />
          <stop offset="40%"  stopColor="#d97706" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
        </radialGradient>
        {/* Moon glow */}
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#e8d5f5" stopOpacity="0.9" />
          <stop offset="30%"  stopColor="#c4a8e8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        {/* Ground gradient */}
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a0d2a" />
          <stop offset="100%" stopColor="#0d0618" />
        </linearGradient>
        {/* Mist layer */}
        <linearGradient id="mist1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0" />
          <stop offset="20%"  stopColor="#a78bfa" stopOpacity="0.07" />
          <stop offset="50%"  stopColor="#c4b5fd" stopOpacity="0.12" />
          <stop offset="80%"  stopColor="#a78bfa" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mist2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ddd6fe" stopOpacity="0.05" />
          <stop offset="30%"  stopColor="#ddd6fe" stopOpacity="0.1" />
          <stop offset="70%"  stopColor="#ddd6fe" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ddd6fe" stopOpacity="0" />
        </linearGradient>
        <filter id="blur1">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="blur2">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="blur3">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="700" height="600" fill="url(#sky)" />

      {/* Stars — layer 1 (tiny) */}
      {[
        [60,40],[120,25],[185,55],[240,18],[310,38],[380,12],[440,48],[510,22],[565,42],[620,15],
        [680,35],[90,80],[155,70],[220,88],[280,60],[350,75],[415,65],[480,85],[540,55],[600,78],
        [650,68],[35,110],[100,130],[170,105],[230,125],[295,98],[360,120],[425,108],[490,132],[555,102],
        [615,128],[670,115],[145,160],[210,148],[270,168],[335,155],[395,142],[460,165],[525,150],
      ].map(([x, y], i) => (
        <circle
          key={`s1-${i}`}
          cx={x} cy={y} r={i % 3 === 0 ? 0.8 : 0.5}
          fill={i % 5 === 0 ? '#ddd6fe' : '#e8e0ff'}
          opacity={0.4 + (i % 4) * 0.15}
        />
      ))}

      {/* Stars — layer 2 (slightly bigger, fewer) */}
      {[
        [75,55],[200,30],[330,20],[490,40],[600,28],[155,95],[285,82],[430,90],[570,72],[660,50],
        [50,135],[190,142],[325,130],[470,138],[610,122],[40,175],[175,180],[310,172],[450,182],
      ].map(([x, y], i) => (
        <circle
          key={`s2-${i}`}
          cx={x} cy={y} r={i % 4 === 0 ? 1.5 : 1}
          fill="#e8d5f5"
          opacity={0.3 + (i % 3) * 0.2}
        />
      ))}

      {/* Moon halo */}
      <circle cx="540" cy="80" r="55" fill="url(#moonGlow)" filter="url(#blur2)" />
      {/* Moon */}
      <circle cx="540" cy="80" r="28" fill="#f0e8ff" opacity="0.92" />
      <circle cx="540" cy="80" r="28" fill="none" stroke="#ddd6fe" strokeWidth="0.5" opacity="0.6" />
      {/* Moon craters */}
      <circle cx="532" cy="72" r="4" fill="#d4c5ee" opacity="0.4" />
      <circle cx="547" cy="83" r="3" fill="#d4c5ee" opacity="0.3" />
      <circle cx="536" cy="88" r="2" fill="#d4c5ee" opacity="0.25" />

      {/* Distant mountains (far background) */}
      <path
        d="M0,320 L60,200 L120,260 L180,170 L250,240 L310,155 L380,225 L440,160 L510,230 L570,175 L640,240 L700,200 L700,380 L0,380 Z"
        fill="#130820"
        opacity="0.9"
      />
      <path
        d="M0,340 L40,240 L90,290 L150,210 L220,270 L280,190 L340,250 L400,185 L460,255 L520,195 L580,260 L640,210 L700,260 L700,380 L0,380 Z"
        fill="#1a0d2e"
        opacity="0.85"
      />

      {/* Castle silhouette (center-right, on hill) */}
      <g transform="translate(330, 200)">
        {/* Hill */}
        <ellipse cx="110" cy="120" rx="130" ry="45" fill="#0f0820" />
        {/* Main keep body */}
        <rect x="70" y="30" width="80" height="90" fill="#0c0618" />
        {/* Left tower */}
        <rect x="48" y="20" width="32" height="100" fill="#0e0720" />
        {/* Right tower */}
        <rect x="140" y="15" width="34" height="105" fill="#0e0720" />
        {/* Center spire */}
        <polygon points="110,0 130,-35 150,0" fill="#120a22" />
        {/* Left tower battlements */}
        <rect x="46" y="14" width="8" height="10" fill="#0e0720" />
        <rect x="58" y="14" width="8" height="10" fill="#0e0720" />
        <rect x="70" y="14" width="8" height="10" fill="#0e0720" />
        {/* Right tower battlements */}
        <rect x="138" y="9" width="8" height="10" fill="#0e0720" />
        <rect x="150" y="9" width="8" height="10" fill="#0e0720" />
        <rect x="162" y="9" width="8" height="10" fill="#0e0720" />
        {/* Gate arch */}
        <path d="M96,120 L96,85 Q110,72 124,85 L124,120 Z" fill="#07040f" />
        {/* Castle window glow */}
        <rect x="86" y="55" width="12" height="14" fill="#f59e0b" opacity="0.18" rx="1" />
        <rect x="116" y="55" width="12" height="14" fill="#f59e0b" opacity="0.15" rx="1" />
        {/* Castle subtle outline */}
        <rect x="70" y="30" width="80" height="90" fill="none" stroke="#2d1845" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* Forest — left cluster */}
      {[
        { x:   0, y: 350, h: 90, w: 34 },
        { x:  22, y: 340, h:100, w: 30 },
        { x:  48, y: 355, h: 85, w: 28 },
        { x:  70, y: 345, h: 95, w: 32 },
        { x:  95, y: 358, h: 80, w: 26 },
        { x: 115, y: 348, h: 92, w: 30 },
        { x: 140, y: 362, h: 76, w: 24 },
        { x: 158, y: 352, h: 88, w: 28 },
        { x: 180, y: 365, h: 74, w: 22 },
        { x: 196, y: 355, h: 84, w: 26 },
        { x: 216, y: 368, h: 72, w: 22 },
        { x: 230, y: 358, h: 80, w: 24 },
      ].map((t, i) => (
        <polygon
          key={`fl-${i}`}
          points={`${t.x + t.w/2},${t.y - t.h} ${t.x + t.w},${t.y} ${t.x},${t.y}`}
          fill={i % 3 === 0 ? '#0b0518' : i % 3 === 1 ? '#0d0620' : '#090416'}
        />
      ))}

      {/* Forest — right cluster */}
      {[
        { x: 480, y: 355, h: 85, w: 30 },
        { x: 505, y: 345, h: 95, w: 32 },
        { x: 530, y: 360, h: 80, w: 28 },
        { x: 555, y: 348, h: 92, w: 30 },
        { x: 578, y: 356, h: 84, w: 28 },
        { x: 600, y: 362, h: 78, w: 26 },
        { x: 622, y: 350, h: 90, w: 30 },
        { x: 648, y: 358, h: 82, w: 28 },
        { x: 672, y: 348, h: 92, w: 32 },
        { x: 700, y: 355, h: 86, w: 30 },
      ].map((t, i) => (
        <polygon
          key={`fr-${i}`}
          points={`${t.x + t.w/2},${t.y - t.h} ${t.x + t.w},${t.y} ${t.x},${t.y}`}
          fill={i % 3 === 0 ? '#0b0518' : i % 3 === 1 ? '#0d0620' : '#090416'}
        />
      ))}

      {/* Ground */}
      <rect x="0" y="370" width="700" height="230" fill="url(#ground)" />

      {/* Tavern (lower-center-left) */}
      <g transform="translate(120, 360)">
        {/* Building body */}
        <rect x="0" y="0" width="90" height="70" fill="#100820" />
        {/* Roof */}
        <polygon points="-5,-5 45,-38 95,-5" fill="#0d0618" />
        {/* Chimney */}
        <rect x="58" y="-42" width="12" height="22" fill="#0d0618" />
        {/* Chimney smoke glow */}
        <ellipse cx="64" cy="-46" rx="8" ry="5" fill="#f59e0b" opacity="0.12" filter="url(#blur1)" />
        {/* Main window — warm glow */}
        <rect x="12" y="10" width="24" height="18" fill="#f59e0b" opacity="0.55" rx="1" />
        <rect x="12" y="10" width="24" height="18" fill="none" stroke="#fbbf24" strokeWidth="0.5" rx="1" />
        {/* Second window */}
        <rect x="54" y="12" width="18" height="14" fill="#f59e0b" opacity="0.35" rx="1" />
        {/* Door */}
        <path d="M36,70 L36,45 Q45,38 54,45 L54,70 Z" fill="#07040f" />
        {/* Sign */}
        <rect x="30" y="-8" width="28" height="10" fill="#1a0d2a" stroke="#3d2060" strokeWidth="0.5" rx="1" />
        <text x="44" y="-1" textAnchor="middle" fontSize="5" fill="#d4b16a" fontFamily="serif">TAVERNA</text>
        {/* Tavern glow halo on ground */}
        <ellipse cx="45" cy="90" rx="80" ry="30" fill="url(#tavernGlow)" filter="url(#blur2)" />
      </g>

      {/* Path / road */}
      <path
        d="M180,430 Q280,410 350,395 Q420,382 500,400 Q560,412 620,430"
        fill="none"
        stroke="#2a1845"
        strokeWidth="8"
        opacity="0.5"
      />
      <path
        d="M180,430 Q280,410 350,395 Q420,382 500,400 Q560,412 620,430"
        fill="none"
        stroke="#3d2060"
        strokeWidth="2"
        opacity="0.3"
      />

      {/* Mist layers — foreground */}
      <rect x="-50" y="360" width="800" height="70" fill="url(#mist1)" opacity="0.9" />
      <rect x="100" y="390" width="600" height="50" fill="url(#mist2)" opacity="0.7" />
      <rect x="-100" y="420" width="900" height="60" fill="url(#mist1)" opacity="0.6" />

      {/* Distant lights (village windows) */}
      {[
        [255, 330], [268, 322], [278, 335], [290, 318], [302, 328],
        [640, 318], [652, 308], [665, 322], [678, 312],
      ].map(([x, y], i) => (
        <g key={`vl-${i}`}>
          <rect x={x - 2} y={y - 3} width={4} height={5} fill="#f59e0b" opacity={0.18 + (i % 3) * 0.08} rx="0.5" />
          <ellipse cx={x} cy={y + 6} rx={6} ry={3} fill="#f59e0b" opacity={0.06} filter="url(#blur1)" />
        </g>
      ))}

      {/* Arcane symbols (faint, scattered) */}
      <g opacity="0.08" stroke="#a78bfa" strokeWidth="0.8" fill="none">
        <circle cx="420" cy="290" r="8" />
        <polygon points="420,282 427,294 413,294" />
        <circle cx="150" cy="280" r="6" />
        <polygon points="150,274 156,285 144,285" />
      </g>

      {/* Horizon fog overlay */}
      <rect x="0" y="300" width="700" height="120" fill="url(#fogHorizon)" />

      {/* Very bottom vignette */}
      <rect x="0" y="480" width="700" height="120" fill="#07040f" opacity="0.85" />
    </svg>
  )
}

// ─── Ornamento separador ─────────────────────────────────────────────────────
function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'1.1rem 0' }}>
      <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.22), transparent)' }} />
      {label && <span style={{ color:'rgba(212,177,106,0.38)', fontSize:'0.62rem', letterSpacing:'0.1em' }}>{label}</span>}
      {!label && <span style={{ color:'rgba(212,177,106,0.3)', fontSize:'0.6rem' }}>✦</span>}
      <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.22), transparent)' }} />
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const { user, signIn, signUp, loading } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [error, setError]     = useState('')

  // Rotating phrase
  const [phrase, setPhrase]   = useState(LOADING_PHRASES[0])
  const [phraseVisible, setPhraseVisible] = useState(true)
  const phraseIdx = useRef(0)

  useEffect(() => {
    // Pick a random starting phrase
    phraseIdx.current = Math.floor(Math.random() * LOADING_PHRASES.length)
    setPhrase(LOADING_PHRASES[phraseIdx.current])

    const cycle = setInterval(() => {
      setPhraseVisible(false)
      setTimeout(() => {
        phraseIdx.current = (phraseIdx.current + 1) % LOADING_PHRASES.length
        setPhrase(LOADING_PHRASES[phraseIdx.current])
        setPhraseVisible(true)
      }, 600)
    }, 4000)

    return () => clearInterval(cycle)
  }, [])

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Informe e-mail e senha para prosseguir.'); return }

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (result) { setError(result.message); return }
    router.push('/dashboard')
  }

  // ── Input style shared ─────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,177,106,0.18)',
    borderRadius: 5,
    color: '#e8d4a0',
    fontSize: '0.85rem',
    fontFamily: 'Georgia, serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.65rem',
    color: 'rgba(212,177,106,0.55)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontFamily: 'Cinzel, serif',
    marginBottom: '0.4rem',
  }

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; height:100%; overflow:hidden; }
        .login-root { display:flex; min-height:100vh; height:100vh; overflow:hidden; }

        /* ── Left panel ── */
        .login-left {
          width: 420px;
          min-width: 320px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2.5rem 2.25rem;
          background: linear-gradient(175deg, rgba(10,5,2,0.99) 0%, rgba(6,3,1,0.98) 100%);
          border-right: 1px solid rgba(212,177,106,0.12);
          position: relative;
          z-index: 2;
          overflow-y: auto;
          box-shadow: 4px 0 32px rgba(0,0,0,0.6);
        }

        /* ── Right panel ── */
        .login-right {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #07040f;
        }

        /* ── Mode tabs ── */
        .mode-tab {
          flex: 1;
          padding: 0.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: rgba(212,177,106,0.35);
          font-family: 'Cinzel', serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mode-tab.active {
          color: #d4b16a;
          border-bottom-color: rgba(212,177,106,0.55);
        }
        .mode-tab:hover:not(.active) {
          color: rgba(212,177,106,0.6);
        }

        /* ── Primary button ── */
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(148,96,20,0.96), rgba(90,54,8,0.90) 50%, rgba(148,96,20,0.96));
          border: 1px solid rgba(212,177,106,0.48);
          border-radius: 5px;
          color: #f2e2a8;
          font-family: 'Cinzel', serif;
          font-size: 0.84rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          cursor: pointer;
          text-shadow: 0 0 10px rgba(242,226,168,0.3);
          transition: all 0.2s ease;
          box-shadow: 0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(180,118,25,0.98), rgba(110,66,10,0.92) 50%, rgba(180,118,25,0.98));
          box-shadow: 0 0 24px rgba(212,177,106,0.18), 0 4px 16px rgba(0,0,0,0.5);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { opacity: 0.65; cursor: wait; }

        /* ── Ghost button ── */
        .btn-ghost {
          display: block;
          width: 100%;
          padding: 0.6rem;
          background: none;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          color: rgba(212,177,106,0.55);
          font-family: 'Cinzel', serif;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          border-color: rgba(212,177,106,0.28);
          color: rgba(212,177,106,0.8);
          background: rgba(212,177,106,0.04);
        }

        /* ── Phrase fade ── */
        .phrase-text {
          transition: opacity 0.5s ease;
        }

        /* ── Art animation (fog drift) ── */
        @keyframes fogDrift {
          0%   { transform: translateX(-20px); opacity: 0.7; }
          50%  { transform: translateX(20px);  opacity: 1;   }
          100% { transform: translateX(-20px); opacity: 0.7; }
        }
        @keyframes tavernFlicker {
          0%,100% { opacity: 0.92; }
          25%      { opacity: 0.85; }
          50%      { opacity: 0.97; }
          75%      { opacity: 0.88; }
        }
        @keyframes starTwinkle {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1;   }
        }
        .art-fog    { animation: fogDrift      8s ease-in-out infinite; }
        .art-flicker{ animation: tavernFlicker 3.2s ease-in-out infinite; }
        .art-star   { animation: starTwinkle   2.8s ease-in-out infinite; }

        /* ── Corner ornaments ── */
        .corner { position:absolute; width:18px; height:18px; }
        .corner-tl { top:10px; left:10px;  border-top:1.5px solid rgba(212,177,106,0.3); border-left:1.5px solid rgba(212,177,106,0.3); border-radius:2px 0 0 0; }
        .corner-tr { top:10px; right:10px; border-top:1.5px solid rgba(212,177,106,0.3); border-right:1.5px solid rgba(212,177,106,0.3); border-radius:0 2px 0 0; }
        .corner-bl { bottom:10px; left:10px;  border-bottom:1.5px solid rgba(212,177,106,0.3); border-left:1.5px solid rgba(212,177,106,0.3); border-radius:0 0 0 2px; }
        .corner-br { bottom:10px; right:10px; border-bottom:1.5px solid rgba(212,177,106,0.3); border-right:1.5px solid rgba(212,177,106,0.3); border-radius:0 0 2px 0; }

        /* ── Responsive: mobile stacked ── */
        @media (max-width: 768px) {
          .login-root { flex-direction: column; overflow: auto; height: auto; }
          .login-left { width: 100%; min-width: 0; border-right: none; border-bottom: 1px solid rgba(212,177,106,0.12); overflow-y: visible; }
          .login-right { min-height: 300px; height: 300px; flex: none; }
          html, body { overflow: auto; }
        }

        /* ── Input focus ── */
        .login-input:focus {
          border-color: rgba(212,177,106,0.42) !important;
          background: rgba(255,255,255,0.06) !important;
          outline: none;
        }
      `}</style>

      <div className="login-root">

        {/* ══════════════════════════════════════
            LEFT PANEL — Formulário
        ══════════════════════════════════════ */}
        <div className="login-left">
          {/* Corner ornaments */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          {/* Logo / Brand */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none" style={{ color:'#d4b16a' }}>
                <polygon points="13,1 24,8 24,18 13,25 2,18 2,8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.9" />
                <polygon points="13,5 20,16 6,16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.6" />
                <circle cx="13" cy="13" r="1.5" fill="currentColor" opacity="0.8" />
              </svg>
              <span style={{ fontFamily:'Cinzel, serif', fontSize:'1.1rem', fontWeight:700, color:'#e8d4a0', letterSpacing:'0.08em', textShadow:'0 0 16px rgba(212,177,106,0.2)' }}>
                Oráculo d20
              </span>
            </div>
            <p style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:'0.68rem', color:'rgba(212,177,106,0.4)', margin:0, letterSpacing:'0.04em' }}>
              Toda lenda começa com uma escolha.
            </p>
          </div>

          <Divider />

          {/* Mode tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(212,177,106,0.1)', marginBottom:'1.5rem' }}>
            <button
              type="button"
              className={`mode-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => { setMode('login'); setError('') }}
            >
              Adentrar
            </button>
            <button
              type="button"
              className={`mode-tab${mode === 'register' ? ' active' : ''}`}
              onClick={() => { setMode('register'); setError('') }}
            >
              Iniciar Jornada
            </button>
          </div>

          {/* Title */}
          <div style={{ marginBottom:'1.25rem' }}>
            <h1 style={{ fontFamily:'Cinzel, serif', fontSize:'1.15rem', fontWeight:700, color:'#e8d4a0', letterSpacing:'0.06em', textShadow:'0 0 20px rgba(212,177,106,0.22)', margin:'0 0 4px' }}>
              {mode === 'login' ? 'Entrada do Aventureiro' : 'Forjar Identidade'}
            </h1>
            <p style={{ fontFamily:'Georgia, serif', fontSize:'0.72rem', color:'rgba(156,163,175,0.65)', margin:0, fontStyle:'italic', lineHeight:1.5 }}>
              {mode === 'login'
                ? 'Identifique-se para continuar sua jornada.'
                : 'Registre seu nome nos anais do reino.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input
                className="login-input"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                className="login-input"
                style={inputStyle}
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{ fontSize:'0.78rem', color:'#fca5a5', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:4, padding:'0.55rem 0.75rem', lineHeight:1.4 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:'0.15rem' }}>
              {loading
                ? 'Abrindo os portões...'
                : mode === 'login' ? 'Adentrar o Reino' : 'Iniciar uma Nova Jornada'}
            </button>
          </form>

          <Divider label="ou" />

          {/* Guest CTA */}
          <Link href="/dashboard" className="btn-ghost" style={{ marginBottom:'0.75rem' }}>
            ⚔ Entrar como Aventureiro
          </Link>

          {/* Playtest note */}
          <p style={{ fontSize:'0.62rem', color:'rgba(156,163,175,0.4)', textAlign:'center', lineHeight:1.6, margin:0, fontFamily:'Georgia, serif', fontStyle:'italic' }}>
            Durante o playtest você pode entrar em uma mesa como convidado diretamente pela campanha, sem cadastro.
          </p>
        </div>

        {/* ══════════════════════════════════════
            RIGHT PANEL — Arte & Narrativa
        ══════════════════════════════════════ */}
        <div className="login-right">

          {/* Arte SVG — ocupa todo o painel */}
          <div className="art-flicker" style={{ position:'absolute', inset:0 }}>
            <ValdrakArt />
          </div>

          {/* Overlay gradient para legibilidade do texto */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to right, rgba(7,4,15,0.55) 0%, rgba(7,4,15,0.1) 40%, rgba(7,4,15,0.0) 100%)',
            pointerEvents:'none',
          }} />
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to top, rgba(7,4,15,0.92) 0%, rgba(7,4,15,0.3) 30%, rgba(7,4,15,0) 55%)',
            pointerEvents:'none',
          }} />

          {/* Conteúdo narrativo — posicionado na parte inferior */}
          <div style={{
            position:'absolute',
            bottom:0, left:0, right:0,
            padding:'2.5rem 2.5rem 2rem',
            zIndex:2,
          }}>

            {/* Título */}
            <h2 style={{
              fontFamily:'Cinzel, serif',
              fontSize:'clamp(1.3rem, 2.5vw, 1.85rem)',
              fontWeight:700,
              color:'#f0e0c0',
              letterSpacing:'0.08em',
              textShadow:'0 0 32px rgba(212,177,106,0.35), 0 2px 8px rgba(0,0,0,0.8)',
              margin:'0 0 0.6rem',
              lineHeight:1.2,
            }}>
              Bem-vindo ao Oráculo D20
            </h2>

            {/* Subtítulo */}
            <p style={{
              fontFamily:'Georgia, serif',
              fontStyle:'italic',
              fontSize:'clamp(0.82rem, 1.3vw, 0.95rem)',
              color:'rgba(212,177,106,0.7)',
              margin:'0 0 1rem',
              lineHeight:1.5,
              textShadow:'0 1px 4px rgba(0,0,0,0.8)',
            }}>
              Nem todas as histórias já foram escritas.
            </p>

            {/* Narrativa */}
            <div style={{
              fontFamily:'Georgia, serif',
              fontSize:'clamp(0.72rem, 1.1vw, 0.82rem)',
              color:'rgba(200,180,150,0.75)',
              lineHeight:1.7,
              maxWidth:520,
              textShadow:'0 1px 3px rgba(0,0,0,0.9)',
              marginBottom:'1.25rem',
            }}>
              <p style={{ margin:'0 0 0.65rem' }}>
                Além destas portas existe um mundo vivo onde vilas desaparecem sob a névoa, cultos ocultos se escondem nas sombras e antigas criaturas observam os viajantes que ousam desafiar o destino.
              </p>
              <p style={{ margin:'0 0 0.65rem' }}>
                Aqui você não encontrará missões repetidas nem caminhos pré-definidos.{' '}
                <span style={{ color:'rgba(212,177,106,0.9)' }}>Cada decisão altera a narrativa.</span>{' '}
                Cada dado lançado pode mudar o rumo da aventura. Cada personagem deixa sua própria marca na história.
              </p>
              <p style={{ margin:'0 0 0.5rem', color:'rgba(212,177,106,0.5)', fontStyle:'italic', fontSize:'0.78rem' }}>
                O Mestre observa. Os pergaminhos registram. E os reinos lembram.
              </p>
            </div>

            {/* Phrase rotativa */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              marginBottom:'1.4rem',
              minHeight:20,
            }}>
              <span style={{ fontSize:'0.65rem', color:'rgba(167,139,250,0.5)' }}>✦</span>
              <span
                className="phrase-text"
                style={{
                  fontFamily:'Georgia, serif',
                  fontStyle:'italic',
                  fontSize:'0.72rem',
                  color:'rgba(167,139,250,0.7)',
                  letterSpacing:'0.03em',
                  opacity: phraseVisible ? 1 : 0,
                  textShadow:'0 0 12px rgba(167,139,250,0.3)',
                }}
              >
                {phrase}
              </span>
            </div>

            {/* Feature chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1.5rem' }}>
              {[
                { icon:'⚔', label:'Aventuras cooperativas' },
                { icon:'🎲', label:'Sistema de RPG interativo' },
                { icon:'📜', label:'Histórias geradas dinamicamente' },
                { icon:'🧙', label:'Mestre IA adaptativo' },
                { icon:'🌎', label:'Mundo persistente em evolução' },
              ].map(f => (
                <span key={f.label} style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  padding:'0.28rem 0.7rem',
                  background:'rgba(212,177,106,0.07)',
                  border:'1px solid rgba(212,177,106,0.15)',
                  borderRadius:20,
                  fontSize:'0.65rem',
                  color:'rgba(212,177,106,0.6)',
                  fontFamily:'Georgia, serif',
                  whiteSpace:'nowrap',
                  backdropFilter:'blur(4px)',
                }}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </span>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); document.querySelector<HTMLInputElement>('.login-left input[type="email"]')?.focus() }}
                style={{
                  padding:'0.6rem 1.4rem',
                  background:'linear-gradient(135deg, rgba(148,96,20,0.95), rgba(90,54,8,0.90))',
                  border:'1px solid rgba(212,177,106,0.45)',
                  borderRadius:5,
                  color:'#f2e2a8',
                  fontFamily:'Cinzel, serif',
                  fontSize:'0.78rem',
                  fontWeight:700,
                  letterSpacing:'0.1em',
                  cursor:'pointer',
                  textShadow:'0 0 8px rgba(242,226,168,0.3)',
                  boxShadow:'0 2px 12px rgba(0,0,0,0.5)',
                  transition:'all 0.2s',
                  whiteSpace:'nowrap',
                }}
              >
                Adentrar o Reino
              </button>
              <Link
                href="/create-character"
                style={{
                  display:'inline-flex', alignItems:'center',
                  padding:'0.6rem 1.25rem',
                  background:'rgba(212,177,106,0.06)',
                  border:'1px solid rgba(212,177,106,0.22)',
                  borderRadius:5,
                  color:'rgba(212,177,106,0.75)',
                  fontFamily:'Cinzel, serif',
                  fontSize:'0.78rem',
                  letterSpacing:'0.1em',
                  textDecoration:'none',
                  transition:'all 0.2s',
                  whiteSpace:'nowrap',
                  backdropFilter:'blur(4px)',
                }}
              >
                Forjar um Herói
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
