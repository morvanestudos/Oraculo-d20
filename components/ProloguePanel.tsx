'use client'
import React from 'react'

type Props = {
  text: string | null
  loading: boolean
  characterName?: string
  regenCount: number
  maxRegen?: number
  onAccept: () => void
  onRegenerate: () => void
}

const MAX_REGEN_DEFAULT = 3

export default function ProloguePanel({
  text,
  loading,
  characterName,
  regenCount,
  maxRegen = MAX_REGEN_DEFAULT,
  onAccept,
  onRegenerate,
}: Props) {
  const paragraphs = text ? text.split(/\n\n+/).filter(Boolean) : []
  const canRegen = regenCount < maxRegen

  return (
    <>
      <style>{`
        @keyframes prologue-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .prologue-loading-bar {
          height: 12px; border-radius: 6px;
          background: linear-gradient(90deg,
            rgba(212,177,106,0.08) 25%,
            rgba(212,177,106,0.22) 50%,
            rgba(212,177,106,0.08) 75%);
          background-size: 200% 100%;
          animation: prologue-shimmer 1.6s ease-in-out infinite;
        }
        .prologue-accept-btn {
          padding: 0.78rem 2.5rem;
          background: linear-gradient(135deg, rgba(148,96,20,0.94), rgba(90,54,8,0.90));
          border: 1px solid rgba(212,177,106,0.5); border-radius: 5px;
          color: #f2e2a8; font-family: Cinzel, serif;
          font-size: 0.85rem; font-weight: 600; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.2s;
          text-shadow: 0 0 10px rgba(242,226,168,0.25);
        }
        .prologue-accept-btn:hover { border-color: rgba(212,177,106,0.75); background: linear-gradient(135deg, rgba(168,112,24,0.96), rgba(108,66,10,0.94)); }
        .prologue-regen-btn {
          padding: 0.45rem 1.1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,177,106,0.15); border-radius: 4px;
          color: rgba(212,177,106,0.5); font-size: 0.7rem; font-family: Cinzel, serif; letter-spacing: 0.08em;
          cursor: pointer; transition: all 0.2s;
        }
        .prologue-regen-btn:hover:not(:disabled) { background: rgba(212,177,106,0.06); border-color: rgba(212,177,106,0.32); color: rgba(212,177,106,0.8); }
        .prologue-regen-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      {/* Backdrop — no click-dismiss, player must accept */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9994,
        background: 'rgba(2,1,0,0.9)', backdropFilter: 'blur(3px)',
      }} />

      {/* Scroll container */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9995,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
      }}>
        <div style={{
          position: 'relative',
          maxWidth: 580, width: '100%',
          maxHeight: '92vh', overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '2.4rem 2.2rem 2rem',
          background: 'linear-gradient(175deg, rgba(24,14,5,0.99), rgba(12,7,2,0.99))',
          border: '1px solid rgba(212,177,106,0.25)', borderRadius: 8,
          boxShadow: '0 0 90px rgba(0,0,0,0.9), 0 0 40px rgba(212,177,106,0.05), inset 0 1px 0 rgba(212,177,106,0.1)',
        }}>
          {/* Corner ornaments */}
          {[{t:10,l:10,bt:'1.5px',bl:'1.5px'}, {t:10,r:10,bt:'1.5px',br:'1.5px'}, {b:10,l:10,bb:'1.5px',bl:'1.5px'}, {b:10,r:10,bb:'1.5px',br:'1.5px'}].map((o, i) => (
            <div key={i} style={{
              position:'absolute', width:18, height:18,
              top: o.t, left: o.l, right: o.r, bottom: o.b,
              borderTop: o.bt ? `${o.bt} solid rgba(212,177,106,0.35)` : undefined,
              borderBottom: o.bb ? `${o.bb} solid rgba(212,177,106,0.35)` : undefined,
              borderLeft: o.bl ? `${o.bl} solid rgba(212,177,106,0.35)` : undefined,
              borderRight: o.br ? `${o.br} solid rgba(212,177,106,0.35)` : undefined,
            }} />
          ))}

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
            <div style={{
              fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.3em',
              color: 'rgba(212,177,106,0.45)', marginBottom: 8,
            }}>
              Prólogo
            </div>
            <h2 style={{
              fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 700,
              color: '#e8d4a0', letterSpacing: '0.06em',
              textShadow: '0 0 22px rgba(212,177,106,0.28)', margin: 0,
            }}>
              {characterName ? `A chegada de ${characterName}` : 'Seu destino começa aqui'}
            </h2>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.5rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
            <span style={{ color:'rgba(212,177,106,0.4)', fontSize:'0.65rem' }}>✦</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'2rem' }}>
              <p style={{
                textAlign:'center', color:'rgba(212,177,106,0.45)', fontSize:'0.78rem',
                fontFamily:'Georgia, serif', fontStyle:'italic', marginBottom:16,
              }}>
                O Oráculo está escrevendo seu destino...
              </p>
              {[80,95,72,90,65].map((w, i) => (
                <div key={i} className="prologue-loading-bar" style={{ width:`${w}%` }} />
              ))}
            </div>
          ) : (
            <div style={{ marginBottom:'2rem' }}>
              {paragraphs.map((para, i) => {
                const isLast = i === paragraphs.length - 1
                return (
                  <p key={i} style={{
                    color: isLast ? '#c8a85a' : '#b09870',
                    fontSize: '0.88rem',
                    lineHeight: 1.85,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic',
                    margin: '0 0 1.1rem',
                    fontWeight: isLast ? 500 : 400,
                  }}>
                    {para}
                  </p>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <button
              className="prologue-accept-btn"
              onClick={onAccept}
              disabled={loading}
            >
              Aceitar prólogo e entrar na mesa
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button
                className="prologue-regen-btn"
                onClick={onRegenerate}
                disabled={loading || !canRegen}
                title={canRegen ? undefined : `Limite de ${maxRegen} gerações atingido`}
              >
                ↺ Gerar outro prólogo
              </button>
              {regenCount > 0 && (
                <span style={{ fontSize:'0.6rem', color:'rgba(212,177,106,0.3)' }}>
                  {regenCount}/{maxRegen}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
