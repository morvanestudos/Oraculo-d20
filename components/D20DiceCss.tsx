'use client'

import React from 'react'

type Props = {
  result?: number | null
  rolling?: boolean
  onRoll?: () => void
  highlight?: boolean
}

export default function D20DiceCss({ result, rolling, onRoll, highlight }: Props) {
  const label =
    result === 20 ? '⚡ Sucesso Espetacular!' :
    result === 1  ? '💀 Falha Crítica!' :
    result != null ? `Resultado: ${result}` : null

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <style>{`
        @keyframes diceRoll {
          0%   { transform: rotate(0deg)   scale(1);   }
          20%  { transform: rotate(144deg) scale(1.15); }
          40%  { transform: rotate(288deg) scale(0.9);  }
          60%  { transform: rotate(432deg) scale(1.1);  }
          80%  { transform: rotate(576deg) scale(0.95); }
          100% { transform: rotate(720deg) scale(1);   }
        }
        @keyframes diceGlow {
          0%, 100% { filter: brightness(1)   drop-shadow(0 0 8px #7c3aed); }
          50%       { filter: brightness(1.6) drop-shadow(0 0 24px #a78bfa); }
        }
        .d20-rolling {
          animation: diceRoll 0.7s ease-in-out, diceGlow 0.35s ease-in-out 2;
        }
        .d20-idle {
          filter: drop-shadow(0 0 10px #7c3aed88);
          transition: filter 0.4s;
        }
        .d20-idle:hover {
          filter: drop-shadow(0 0 18px #a78bfa);
        }
      `}</style>

      {/* D20 shape — regular hexagon clip-path approximates the top face of an icosahedron */}
      <div
        className={rolling ? 'd20-rolling' : 'd20-idle'}
        style={{
          width: 128,
          height: 128,
          background: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 50%, #1e1b4b 100%)',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* inner decorative triangle */}
        <div style={{
          position: 'absolute',
          inset: '24px',
          border: '1px solid rgba(167,139,250,0.35)',
          clipPath: 'polygon(50% 5%, 95% 90%, 5% 90%)',
        }} />

        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: rolling ? '1.6rem' : '2rem',
          fontWeight: 'bold',
          color: rolling ? '#fbbf24' : '#ede9fe',
          textShadow: '0 0 12px rgba(167,139,250,0.9)',
          userSelect: 'none',
          letterSpacing: '-0.5px',
          zIndex: 1,
        }}>
          {rolling ? '?' : (result ?? '✦')}
        </span>
      </div>

      <button
        onClick={onRoll}
        disabled={rolling}
        className="dice-button"
        style={{
          opacity: rolling ? 0.65 : 1,
          cursor: rolling ? 'not-allowed' : 'pointer',
          ...(highlight && !rolling ? {
            boxShadow: '0 0 16px rgba(239,68,68,0.5), 0 0 32px rgba(239,68,68,0.2)',
            background: 'linear-gradient(135deg, #dc2626, #7c3aed)',
          } : {}),
        }}
      >
        {rolling ? 'Consultando o oráculo…' : highlight ? '🎲 Rolar Dado — Teste Pendente' : 'Consultar os Destinos'}
      </button>

      {label && !rolling && (
        <p style={{
          fontSize: '0.78rem',
          fontStyle: 'italic',
          color: result === 20 ? '#fbbf24' : result === 1 ? '#f87171' : '#a78bfa',
          textAlign: 'center',
          margin: 0,
        }}>
          {label}
        </p>
      )}
    </div>
  )
}
