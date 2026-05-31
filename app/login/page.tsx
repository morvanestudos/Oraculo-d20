'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/useAuth'
import { LOADING_PHRASES } from '../../lib/loadingPhrases'



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

          {/* Imagem de fallback — renderiza abaixo do vídeo */}
          <img
            src="/images/login-bg.jpg"
            alt="Oráculo D20"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}
          />

          {/* Vídeo cinematográfico de fundo */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:1 }}
          >
            <source src="/videos/login-bg.mp4" type="video/mp4" />
          </video>

          {/* Overlay escuro sobre o vídeo */}
          <div
            className="absolute inset-0"
            style={{
              position:'absolute', inset:0,
              background:'rgba(0,0,0,0.55)',
              backdropFilter:'blur(1px)',
              zIndex:2,
              pointerEvents:'none',
            }}
          />

          {/* Gradiente lateral (integração visual com painel esquerdo) */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to right, rgba(7,4,15,0.45) 0%, rgba(7,4,15,0.05) 35%, rgba(7,4,15,0.0) 100%)',
            zIndex:3,
            pointerEvents:'none',
          }} />

          {/* Gradiente inferior (legibilidade do texto narrativo) */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to top, rgba(7,4,15,0.95) 0%, rgba(7,4,15,0.4) 28%, rgba(7,4,15,0) 50%)',
            zIndex:3,
            pointerEvents:'none',
          }} />

          {/* Conteúdo narrativo — posicionado na parte inferior */}
          <div style={{
            position:'absolute',
            bottom:0, left:0, right:0,
            padding:'2.5rem 2.5rem 2rem',
            zIndex:4,
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
