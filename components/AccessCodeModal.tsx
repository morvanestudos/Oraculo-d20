'use client'
import React, { useRef, useState } from 'react'

type Props = {
  campaignId: string
  campaignTitle: string
  onAccessGranted: (code: string) => void
}

export default function AccessCodeModal({ campaignId, campaignTitle, onAccessGranted }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()

      if (data.success) {
        onAccessGranted(trimmed)
      } else {
        setError(data.error ?? 'Código incorreto. Fale com o mestre da mesa.')
        setCode('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Não foi possível verificar o código. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .access-input {
          width: 100%; padding: 10px 14px; box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(212,177,106,0.22);
          border-radius: 4px;
          color: #e8d89a; font-family: Cinzel, serif;
          font-size: 1.05rem; font-weight: 600;
          letter-spacing: 0.25em; text-align: center; text-transform: uppercase;
          outline: none; transition: border-color 0.2s;
        }
        .access-input::placeholder { color: rgba(212,177,106,0.25); letter-spacing: 0.1em; font-weight: 400; font-family: Georgia, serif; }
        .access-input:focus { border-color: rgba(212,177,106,0.55); box-shadow: 0 0 0 2px rgba(212,177,106,0.12); }
        .access-btn {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg, rgba(148,96,20,0.94), rgba(90,54,8,0.90));
          border: 1px solid rgba(212,177,106,0.45); border-radius: 4px;
          color: #f2e2a8; font-family: Cinzel, serif;
          font-size: 0.85rem; font-weight: 600; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.2s;
          text-shadow: 0 0 10px rgba(242,226,168,0.25);
        }
        .access-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(168,112,24,0.96), rgba(108,66,10,0.94));
          border-color: rgba(212,177,106,0.7);
          box-shadow: 0 0 16px rgba(212,177,106,0.2);
        }
        .access-btn:disabled { opacity: 0.5; cursor: wait; }
      `}</style>

      {/* Backdrop — no dismiss on click, access is required */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(2,1,0,0.94)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 380,
          padding: '2.2rem 1.8rem 1.8rem',
          background: 'linear-gradient(175deg, rgba(22,13,5,0.99), rgba(11,6,2,0.99))',
          border: '1px solid rgba(212,177,106,0.25)', borderRadius: 8,
          boxShadow: '0 0 80px rgba(0,0,0,0.85), 0 0 30px rgba(212,177,106,0.06), inset 0 1px 0 rgba(212,177,106,0.1)',
        }}>
          {/* Corner ornaments */}
          <div style={{ position:'absolute', top:10, left:10, width:16, height:16, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', top:10, right:10, width:16, height:16, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, left:10, width:16, height:16, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, right:10, width:16, height:16, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />

          {/* Icon + Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🔑</div>
            <h2 style={{
              fontFamily: 'Cinzel, serif', fontSize: '1.2rem', fontWeight: 700,
              color: '#e8d4a0', letterSpacing: '0.06em',
              textShadow: '0 0 20px rgba(212,177,106,0.25)', margin: '0 0 0.4rem',
            }}>
              Acesso Restrito
            </h2>
            <p style={{
              color: '#9a8060', fontSize: '0.78rem',
              fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: 0,
            }}>
              {campaignTitle} exige um código de acesso.
            </p>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)', marginBottom:'1.25rem' }} />

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <label style={{
                display:'block', fontSize:'0.62rem', textTransform:'uppercase',
                letterSpacing:'0.2em', color:'rgba(212,177,106,0.55)', marginBottom:6,
              }}>
                Código da mesa
              </label>
              <input
                ref={inputRef}
                className="access-input"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ex: CORVOS"
                maxLength={20}
                autoFocus
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {error && (
              <div style={{
                padding: '7px 10px',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 4,
                color: '#f87171', fontSize: '0.75rem', fontFamily: 'Georgia, serif',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="access-btn" disabled={!code.trim() || loading}>
              {loading ? 'Verificando...' : 'Entrar na mesa'}
            </button>
          </form>

          <p style={{
            color: '#3a2a10', fontSize: '0.65rem',
            textAlign: 'center', marginTop: 14, marginBottom: 0,
            fontFamily: 'Georgia, serif',
          }}>
            Peça o código ao mestre da campanha.
          </p>
        </div>
      </div>
    </>
  )
}
