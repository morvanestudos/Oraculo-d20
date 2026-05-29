'use client'

import React, { useRef, useState } from 'react'

type Props = {
  onJoin: (playerName: string) => void
}

export default function GuestEntryModal({ onJoin }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    onJoin(trimmed)
  }

  return (
    <>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        .guest-modal-card {
          animation: fadeInModal 0.3s ease-out;
        }
        .guest-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid #5c4a1a;
          border-radius: 4px;
          color: #e8d89a;
          font-family: Georgia, serif;
          font-size: 1rem;
          padding: 10px 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .guest-input::placeholder { color: #6b5a2a; }
        .guest-input:focus { border-color: #b8960c; box-shadow: 0 0 0 2px rgba(184,150,12,0.2); }
        .guest-btn {
          width: 100%;
          background: linear-gradient(135deg, #7c3a00 0%, #a05000 100%);
          border: 1px solid #b8960c;
          border-radius: 4px;
          color: #f5e070;
          font-family: Georgia, serif;
          font-size: 0.9rem;
          letter-spacing: 0.06em;
          padding: 11px;
          cursor: pointer;
          transition: all 0.2s;
          text-shadow: 0 0 8px rgba(245,224,112,0.4);
        }
        .guest-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #a05000 0%, #c06010 100%);
          box-shadow: 0 0 14px rgba(184,150,12,0.5);
        }
        .guest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)',
      }}>
        <div className="guest-modal-card" style={{
          background: 'linear-gradient(160deg, #120900 0%, #0a0600 100%)',
          border: '1px solid #7c5c10',
          borderRadius: 6,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(184,150,12,0.15)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎲</div>
            <h2 style={{
              color: '#d4af37',
              fontFamily: 'Georgia, serif',
              fontSize: '1.25rem',
              margin: '0 0 6px',
              textShadow: '0 0 10px rgba(212,175,55,0.35)',
            }}>
              Bem-vindo à Mesa
            </h2>
            <p style={{
              color: '#9e8a50',
              fontSize: '0.82rem',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              margin: 0,
            }}>
              Como você quer ser chamado?
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              ref={inputRef}
              className="guest-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome de aventureiro..."
              maxLength={30}
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              className="guest-btn"
              disabled={!name.trim() || loading}
            >
              {loading ? 'Entrando...' : 'Entrar na mesa'}
            </button>
          </form>

          <p style={{
            color: '#4a3a18',
            fontSize: '0.7rem',
            textAlign: 'center',
            marginTop: 16,
            marginBottom: 0,
            fontFamily: 'Georgia, serif',
          }}>
            Nenhuma senha necessária para o playtest.
          </p>
        </div>
      </div>
    </>
  )
}
