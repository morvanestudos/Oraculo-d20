'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FantasyBackground from '../../components/FantasyBackground'
import { useAuth } from '../../lib/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { user, signIn, signUp, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Informe email e senha.')
      return
    }

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (result) {
      setError(result.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <FantasyBackground image="/images/bg-home.jpg" overlayIntensity={0.75}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(175deg, rgba(20,12,5,0.99) 0%, rgba(10,6,2,0.98) 100%)',
          border: '1px solid rgba(212,177,106,0.25)',
          borderRadius: 10,
          padding: '2.5rem 2rem 2rem',
          boxShadow: [
            '0 0 80px rgba(0,0,0,0.8)',
            '0 0 40px rgba(212,177,106,0.05)',
            'inset 0 1px 0 rgba(212,177,106,0.10)',
          ].join(', '),
          position: 'relative',
        }}>
          {/* Corner ornaments */}
          <div style={{ position:'absolute', top:10, left:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)', borderRadius:'2px 0 0 0' }} />
          <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)', borderRadius:'0 2px 0 0' }} />
          <div style={{ position:'absolute', bottom:10, left:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)', borderRadius:'0 0 0 2px' }} />
          <div style={{ position:'absolute', bottom:10, right:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)', borderRadius:'0 0 2px 0' }} />

          {/* Title */}
          <div className="text-center mb-6">
            <h1 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '1.45rem',
              fontWeight: 700,
              color: '#e8d4a0',
              letterSpacing: '0.06em',
              textShadow: '0 0 24px rgba(212,177,106,0.28)',
              margin: 0,
            }}>
              {mode === 'login' ? 'Entrada do Aventureiro' : 'Forjar Identidade'}
            </h1>
            <p className="text-sm text-muted mt-2">
              {mode === 'login'
                ? 'Identifique-se para continuar sua jornada no Oráculo d20.'
                : 'Crie sua conta para entrar nas mesas do Oráculo d20.'}
            </p>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.5rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
            <span style={{ color:'rgba(212,177,106,0.45)', fontSize:'0.65rem' }}>✦</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Senha</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            {error && (
              <div className="text-sm text-blood bg-blood/10 border border-blood/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.72rem',
                background: 'linear-gradient(135deg, rgba(148,96,20,0.95), rgba(90,54,8,0.90) 50%, rgba(148,96,20,0.95))',
                border: '1px solid rgba(212,177,106,0.5)',
                borderRadius: 5,
                color: '#f2e2a8',
                fontFamily: 'Cinzel, serif',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                textShadow: '0 0 10px rgba(242,226,168,0.3)',
                transition: 'all 0.2s ease',
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-4 text-sm text-center text-muted">
            {mode === 'login' ? (
              <>
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError('') }}
                  style={{ color: '#d4b16a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError('') }}
                  style={{ color: '#d4b16a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  Entrar
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'1.25rem 0 1rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
            <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.6rem' }}>ou</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
          </div>

          {/* Guest CTA */}
          <Link
            href="/dashboard"
            className="block text-center text-sm py-2 px-4 rounded-lg border border-[rgba(255,255,255,0.08)] text-muted hover:border-[rgba(212,177,106,0.2)] hover:text-gold transition"
          >
            Entrar como convidado
          </Link>

          {/* Playtest note */}
          <p className="mt-4 text-xs text-center text-muted leading-relaxed" style={{ color: 'rgba(156,163,175,0.65)' }}>
            Durante o playtest, você também pode entrar em uma mesa como convidado diretamente pela campanha.
          </p>
        </div>
      </div>
    </FantasyBackground>
  )
}
