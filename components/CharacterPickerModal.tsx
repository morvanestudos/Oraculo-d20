'use client'
import React from 'react'
import Link from 'next/link'
import type { Character, CampaignPlayer } from '../lib/types'
import { getPlayerId } from '../lib/storage'

type Props = {
  campaignId: string
  availableCharacters: Character[]
  onlinePlayers: CampaignPlayer[]
  onSelect: (character: Character) => void
  isJoining: boolean
}

export default function CharacterPickerModal({
  campaignId,
  availableCharacters,
  onlinePlayers,
  onSelect,
  isJoining,
}: Props) {
  const myPlayerId = getPlayerId()

  // Characters already taken by OTHER players
  const takenByOthers = new Set(
    onlinePlayers
      .filter(p => p.characterId != null && p.playerId !== myPlayerId)
      .map(p => p.characterId as string)
  )

  return (
    <>
      <style>{`
        .char-pick-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0.85rem 1rem;
          background: rgba(212,177,106,0.04);
          border: 1px solid rgba(212,177,106,0.12);
          border-radius: 6px;
          transition: border-color 0.2s, background 0.2s;
        }
        .char-pick-card:not(.taken):hover {
          background: rgba(212,177,106,0.08);
          border-color: rgba(212,177,106,0.28);
        }
        .char-pick-card.taken {
          opacity: 0.45;
        }
        .char-pick-select-btn {
          padding: 0.4rem 1rem;
          background: linear-gradient(135deg, rgba(148,96,20,0.92), rgba(90,54,8,0.88));
          border: 1px solid rgba(212,177,106,0.45);
          border-radius: 4px;
          color: #f2e2a8;
          font-family: Cinzel, serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .char-pick-select-btn:hover:not(:disabled) {
          border-color: rgba(212,177,106,0.7);
          background: linear-gradient(135deg, rgba(168,112,24,0.96), rgba(108,66,10,0.94));
        }
        .char-pick-select-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .char-pick-create-btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(212,177,106,0.2);
          border-radius: 6px;
          color: rgba(212,177,106,0.65);
          font-family: Cinzel, serif;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .char-pick-create-btn:hover {
          background: rgba(212,177,106,0.06);
          border-color: rgba(212,177,106,0.4);
          color: rgba(212,177,106,0.9);
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(2,1,0,0.88)',
        backdropFilter: 'blur(3px)',
      }} />

      {/* Scroll container */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9991,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
      }}>
        <div style={{
          position: 'relative',
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '2.2rem 2rem 1.8rem',
          background: 'linear-gradient(175deg, rgba(22,13,5,0.99), rgba(11,6,2,0.99))',
          border: '1px solid rgba(212,177,106,0.25)',
          borderRadius: 8,
          boxShadow: '0 0 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(212,177,106,0.1)',
        }}>
          {/* Corner ornaments */}
          <div style={{ position:'absolute', top:10, left:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, left:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, right:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#e8d4a0',
              letterSpacing: '0.06em',
              textShadow: '0 0 24px rgba(212,177,106,0.28)',
              margin: '0 0 0.4rem',
            }}>
              Escolha seu personagem
            </h2>
            <p style={{
              color: '#9a8060',
              fontSize: '0.82rem',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              margin: 0,
            }}>
              Escolha um personagem para entrar na aventura.
            </p>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.25rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
            <span style={{ color:'rgba(212,177,106,0.4)', fontSize:'0.6rem' }}>✦</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
          </div>

          {/* Character list */}
          {availableCharacters.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1.25rem' }}>
              {availableCharacters.map(char => {
                const taken = takenByOthers.has(char.id)
                const takenPlayer = taken
                  ? onlinePlayers.find(p => p.characterId === char.id)
                  : null
                return (
                  <div key={char.id} className={`char-pick-card${taken ? ' taken' : ''}`}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Cinzel, serif',
                        fontSize: '0.88rem',
                        color: '#d4b16a',
                        fontWeight: 600,
                      }}>
                        {char.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#7a6040', marginTop: 2 }}>
                        {char.race} · {char.className} · Nv {char.level}
                      </div>
                      {taken && takenPlayer && (
                        <div style={{ fontSize: '0.65rem', color: '#6b4040', marginTop: 3 }}>
                          Usado por {takenPlayer.playerName}
                        </div>
                      )}
                    </div>
                    {taken ? (
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'rgba(156,100,100,0.7)',
                        border: '1px solid rgba(156,100,100,0.2)',
                        borderRadius: 3,
                        padding: '3px 8px',
                        whiteSpace: 'nowrap',
                      }}>
                        Indisponível
                      </span>
                    ) : (
                      <button
                        className="char-pick-select-btn"
                        onClick={() => onSelect(char)}
                        disabled={isJoining}
                      >
                        {isJoining ? '...' : 'Entrar com este'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{
              textAlign: 'center',
              color: '#6a5838',
              fontSize: '0.82rem',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              marginBottom: '1.25rem',
            }}>
              Nenhum personagem criado ainda.
            </p>
          )}

          {/* Create new */}
          <Link
            href={`/create-character?campaignId=${campaignId}&returnTo=/campaigns/${campaignId}`}
            className="char-pick-create-btn"
          >
            + Criar novo personagem
          </Link>
        </div>
      </div>
    </>
  )
}
