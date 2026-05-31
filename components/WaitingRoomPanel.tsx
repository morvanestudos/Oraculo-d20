'use client'
import React from 'react'
import type { Campaign, CampaignPlayer, Character } from '../lib/types'

type Props = {
  campaign: Campaign
  players: CampaignPlayer[]
  allCharacters: Character[]
  myPlayerId: string
  onToggleReady: (ready: boolean) => void
  onStartCampaign: () => void
  isStarting: boolean
  onGeneratePrologue?: () => void
  hasPrologue?: boolean
}

export default function WaitingRoomPanel({
  campaign,
  players,
  allCharacters,
  myPlayerId,
  onToggleReady,
  onStartCampaign,
  isStarting,
  onGeneratePrologue,
  hasPrologue,
}: Props) {
  const myPlayer = players.find(p => p.playerId === myPlayerId)
  const amReady = myPlayer?.ready ?? false
  const hasCharacter = myPlayer?.characterId != null

  // Can start: at least 1 player with character and ready
  const canStart = players.some(p => p.characterId != null && p.ready)

  function charName(characterId: string | null) {
    if (!characterId) return null
    return allCharacters.find(c => c.id === characterId)?.name ?? `#${characterId}`
  }

  return (
    <>
      <style>{`
        @keyframes waiting-pulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .ready-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 3px;
          font-size: 0.62rem; letter-spacing: 0.12em; font-family: Cinzel, serif;
          text-transform: uppercase; font-weight: 600;
        }
        .ready-badge.yes { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
        .ready-badge.no  { background: rgba(212,177,106,0.06); border: 1px solid rgba(212,177,106,0.15); color: rgba(212,177,106,0.5); animation: waiting-pulse 2s ease-in-out infinite; }
        .waiting-toggle-btn {
          padding: 0.72rem 2rem;
          border: 1px solid; border-radius: 5px;
          font-family: Cinzel, serif; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.2s;
        }
        .waiting-toggle-btn.not-ready {
          background: linear-gradient(135deg, rgba(148,96,20,0.92), rgba(90,54,8,0.88));
          border-color: rgba(212,177,106,0.45); color: #f2e2a8;
          text-shadow: 0 0 10px rgba(242,226,168,0.3);
        }
        .waiting-toggle-btn.not-ready:hover:not(:disabled) {
          border-color: rgba(212,177,106,0.7);
          background: linear-gradient(135deg, rgba(168,112,24,0.96), rgba(108,66,10,0.94));
        }
        .waiting-toggle-btn.is-ready {
          background: rgba(74,222,128,0.08);
          border-color: rgba(74,222,128,0.35); color: #4ade80;
        }
        .waiting-toggle-btn.is-ready:hover:not(:disabled) {
          background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.55);
        }
        .waiting-start-btn {
          width: 100%; padding: 0.8rem;
          background: linear-gradient(135deg, rgba(79,70,229,0.9), rgba(124,58,237,0.85));
          border: 1px solid rgba(124,58,237,0.5); border-radius: 5px;
          color: #fff; font-family: Cinzel, serif; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 0 20px rgba(79,70,229,0.2);
        }
        .waiting-start-btn:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(124,58,237,0.35); border-color: rgba(124,58,237,0.75);
        }
        .waiting-start-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .waiting-toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .prologue-gen-btn {
          padding: 0.42rem 1rem;
          background: rgba(79,70,229,0.06);
          border: 1px solid rgba(79,70,229,0.2); border-radius: 4px;
          color: rgba(180,160,240,0.7); font-size: 0.7rem; font-family: Cinzel, serif; letter-spacing: 0.08em;
          cursor: pointer; transition: all 0.2s;
        }
        .prologue-gen-btn:hover { background: rgba(79,70,229,0.12); border-color: rgba(79,70,229,0.4); color: rgba(180,160,240,1); }
        .prologue-gen-btn.has { border-color: rgba(74,222,128,0.2); color: rgba(74,222,128,0.6); background: rgba(74,222,128,0.05); }
        .prologue-gen-btn.has:hover { background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.4); color: rgba(74,222,128,0.9); }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9992,
        background: 'rgba(2,1,0,0.88)', backdropFilter: 'blur(3px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9993,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
      }}>
        <div style={{
          position: 'relative',
          maxWidth: 500, width: '100%',
          maxHeight: '92vh', overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '2.2rem 2rem 1.8rem',
          background: 'linear-gradient(175deg, rgba(22,13,5,0.99), rgba(11,6,2,0.99))',
          border: '1px solid rgba(212,177,106,0.25)', borderRadius: 8,
          boxShadow: '0 0 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(212,177,106,0.1)',
        }}>
          {/* Corner ornaments */}
          <div style={{ position:'absolute', top:10, left:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderTop:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, left:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderLeft:'1.5px solid rgba(212,177,106,0.35)' }} />
          <div style={{ position:'absolute', bottom:10, right:10, width:18, height:18, borderBottom:'1.5px solid rgba(212,177,106,0.35)', borderRight:'1.5px solid rgba(212,177,106,0.35)' }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
            <h2 style={{
              fontFamily: 'Cinzel, serif', fontSize: '1.35rem', fontWeight: 700,
              color: '#e8d4a0', letterSpacing: '0.06em',
              textShadow: '0 0 24px rgba(212,177,106,0.28)', margin: '0 0 0.35rem',
            }}>
              Sala de Espera
            </h2>
            <p style={{
              color: '#9a8060', fontSize: '0.8rem',
              fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: 0,
            }}>
              {campaign.title}
            </p>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.2rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
            <span style={{ color:'rgba(212,177,106,0.4)', fontSize:'0.6rem' }}>⚔</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.28), transparent)' }} />
          </div>

          {/* Player list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1.5rem' }}>
            {players.length === 0 ? (
              <p style={{ textAlign:'center', color:'#6a5838', fontSize:'0.8rem', fontFamily:'Georgia, serif', fontStyle:'italic' }}>
                Aguardando jogadores...
              </p>
            ) : players.map(p => {
              const isMe = p.playerId === myPlayerId
              const cName = charName(p.characterId)
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '0.7rem 0.9rem',
                  background: isMe ? 'rgba(212,177,106,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isMe ? 'rgba(212,177,106,0.18)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 5,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{
                        width:7, height:7, borderRadius:'50%', flexShrink:0,
                        background: '#4ade80', boxShadow: '0 0 5px #4ade80',
                      }} />
                      <span style={{ fontFamily:'Cinzel, serif', fontSize:'0.85rem', color:'#d4b16a', fontWeight: 600 }}>
                        {p.playerName}
                      </span>
                      {isMe && <span style={{ fontSize:'0.6rem', color:'rgba(212,177,106,0.5)', letterSpacing:'0.1em' }}>(você)</span>}
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'#6a5838', marginTop:3, paddingLeft:13 }}>
                      {cName
                        ? <span style={{ color:'#9a8060' }}>{cName}</span>
                        : <span style={{ color:'#5a3828', fontStyle:'italic' }}>sem personagem</span>
                      }
                    </div>
                  </div>
                  <span className={`ready-badge ${p.ready ? 'yes' : 'no'}`}>
                    {p.ready ? '✓ Pronto' : '⋯ Aguardando'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Prologue button for current player with character */}
          {myPlayer && hasCharacter && onGeneratePrologue && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'0.75rem' }}>
              <button
                className={`prologue-gen-btn${hasPrologue ? ' has' : ''}`}
                onClick={onGeneratePrologue}
              >
                {hasPrologue ? '✦ Ver / Regerar prólogo' : '✦ Gerar prólogo do personagem'}
              </button>
            </div>
          )}

          {/* Ready toggle for current player */}
          {myPlayer && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'1rem' }}>
              {!hasCharacter ? (
                <p style={{ color:'#6a5838', fontSize:'0.78rem', fontFamily:'Georgia, serif', fontStyle:'italic', textAlign:'center', margin:0 }}>
                  Escolha um personagem para marcar pronto.
                </p>
              ) : (
                <button
                  className={`waiting-toggle-btn ${amReady ? 'is-ready' : 'not-ready'}`}
                  onClick={() => onToggleReady(!amReady)}
                  disabled={isStarting}
                >
                  {amReady ? '✓ Estou pronto' : 'Estou pronto'}
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'0.75rem 0 1rem' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          </div>

          {/* Start campaign */}
          <button
            className="waiting-start-btn"
            onClick={onStartCampaign}
            disabled={!canStart || isStarting}
            title={canStart ? undefined : 'Aguardando pelo menos 1 jogador pronto com personagem'}
          >
            {isStarting ? 'Iniciando aventura...' : 'Começar campanha'}
          </button>

          {!canStart && (
            <p style={{
              textAlign:'center', marginTop:'0.75rem', marginBottom:0,
              color:'#5a4828', fontSize:'0.7rem', fontFamily:'Georgia, serif', fontStyle:'italic',
            }}>
              Pelo menos 1 aventureiro deve estar pronto com personagem.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
