'use client'

import React, { useEffect, useState } from 'react'
import { createPusherClient } from '../lib/pusher-client'
import type { Quest } from '../lib/types'

type Props = {
  campaignId: string
}

// Detect quest type icon from title + description
function questIcon(title: string, desc?: string | null): string {
  const t = (title + ' ' + (desc ?? '')).toLowerCase()
  if (/cult|ritual|perigo|inimigo|combate|luta|matar|eliminar|ameaça/.test(t)) return '🗡️'
  if (/investigar|descobrir|pista|mistério|segredo|origem|cantos/.test(t)) return '🔍'
  if (/conversar|falar|taverneiro|informação|persuad/.test(t)) return '💬'
  if (/explorar|floresta|norte|caverna|ruínas|região|mapa/.test(t)) return '🗺️'
  if (/resgatar|salvar|ajudar|curar|proteger/.test(t)) return '🛡️'
  return '📜'
}

export default function QuestLog({ campaignId }: Props) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [doneOpen, setDoneOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchQuests() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/quests`)
        if (res.ok && mounted) setQuests(await res.json())
      } catch { /* silent */ }
      finally { if (mounted) setLoading(false) }
    }

    fetchQuests()

    const pusherClient = createPusherClient()
    if (!pusherClient) return () => { mounted = false }

    const channel = pusherClient.subscribe(`campaign-${campaignId}`)
    channel.bind('quest-updated', fetchQuests)

    return () => {
      mounted = false
      channel.unbind('quest-updated', fetchQuests)
      pusherClient.unsubscribe(`campaign-${campaignId}`)
      pusherClient.disconnect()
    }
  }, [campaignId])

  const active    = quests.filter(q => q.status === 'active')
  const done      = quests.filter(q => q.status === 'completed' || q.status === 'failed')
  const principal = active[0] ?? null
  const secondary = active.slice(1)

  return (
    <>
      <style>{`
        @keyframes quest-glow {
          0%,100% { box-shadow: 0 0 6px rgba(212,177,106,0.08); }
          50%      { box-shadow: 0 0 14px rgba(212,177,106,0.22); }
        }
        .quest-principal-card { animation: quest-glow 3s ease-in-out infinite; }
        .quest-done-toggle { cursor:pointer; user-select:none; }
        .quest-done-toggle:hover { color: rgba(212,177,106,0.65) !important; }
      `}</style>

      <div style={{
        background: 'linear-gradient(175deg, rgba(18,10,3,0.99), rgba(10,5,1,0.98))',
        border: '1px solid rgba(212,177,106,0.2)',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: 'Georgia, serif',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(212,177,106,0.07)',
      }}>

        {/* Header */}
        <div style={{
          padding: '0.9rem 1rem 0.75rem',
          borderBottom: '1px solid rgba(212,177,106,0.12)',
          background: 'linear-gradient(180deg, rgba(22,13,4,0.98), rgba(14,8,2,0.96))',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:'0.95rem' }}>📜</span>
            <span style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#c4a870',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textShadow: '0 0 8px rgba(212,177,106,0.25)',
            }}>
              Diário de Aventura
            </span>
            {active.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.58rem',
                background: 'rgba(212,177,106,0.09)',
                border: '1px solid rgba(212,177,106,0.18)',
                borderRadius: 10,
                padding: '1px 7px',
                color: 'rgba(212,177,106,0.6)',
                fontFamily: 'Cinzel, serif',
                letterSpacing: '0.1em',
              }}>
                {active.length} ativa{active.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0.85rem 0.95rem' }}>

          {/* Loading */}
          {loading && (
            <p style={{ color:'#5a4820', fontSize:'0.73rem', fontStyle:'italic', margin:0 }}>
              Consultando os pergaminhos...
            </p>
          )}

          {/* Empty */}
          {!loading && quests.length === 0 && (
            <p style={{ color:'#5a4820', fontSize:'0.73rem', fontStyle:'italic', margin:0, lineHeight:1.5 }}>
              Nenhuma missão registrada.<br />A aventura ainda não revelou seus segredos.
            </p>
          )}

          {/* Quest principal */}
          {!loading && principal && (
            <div style={{ marginBottom:'0.85rem' }}>
              <div style={{
                fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.2em',
                color:'rgba(212,177,106,0.4)', marginBottom:'0.5rem',
                display:'flex', alignItems:'center', gap:6,
                fontFamily:'Cinzel, serif',
              }}>
                <span>★</span> Quest principal
              </div>

              <div
                className="quest-principal-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,16,2,0.98), rgba(20,11,2,0.96))',
                  border: '1px solid rgba(212,177,106,0.28)',
                  borderRadius: 6,
                  padding: '0.75rem 0.85rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Left accent bar */}
                <div style={{
                  position:'absolute', top:0, left:0, bottom:0, width:2.5,
                  background: 'linear-gradient(180deg, rgba(212,177,106,0.7), rgba(212,177,106,0.2))',
                  borderRadius:'0 0 0 6px',
                }} />

                <div style={{ paddingLeft:10 }}>
                  {/* Title */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{ fontSize:'0.82rem' }}>{questIcon(principal.title, principal.description)}</span>
                    <span style={{
                      fontFamily:'Cinzel, serif', fontSize:'0.82rem', fontWeight:700,
                      color:'#e0c870', letterSpacing:'0.03em',
                      textShadow:'0 0 8px rgba(224,200,112,0.2)',
                    }}>
                      {principal.title}
                    </span>
                  </div>

                  {/* Description */}
                  {principal.description && (
                    <p style={{
                      color:'#7a6030', fontSize:'0.72rem', lineHeight:1.55,
                      margin:'0 0 6px', fontStyle:'italic',
                    }}>
                      {principal.description}
                    </p>
                  )}

                  {/* Progress */}
                  {principal.progress && (
                    <div style={{
                      display:'flex', alignItems:'baseline', gap:5,
                      padding:'4px 7px',
                      background:'rgba(212,177,106,0.05)',
                      border:'1px solid rgba(212,177,106,0.1)',
                      borderRadius:3,
                      marginBottom:6,
                    }}>
                      <span style={{ fontSize:'0.6rem', color:'rgba(212,177,106,0.5)' }}>◈</span>
                      <span style={{ fontSize:'0.7rem', color:'#a08840', lineHeight:1.4 }}>
                        {principal.progress}
                      </span>
                    </div>
                  )}

                  {/* Reward */}
                  {principal.reward && (
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:'0.7rem' }}>🎁</span>
                      <span style={{ fontSize:'0.68rem', color:'#6eedb7' }}>
                        {principal.reward}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Secondary active quests */}
          {!loading && secondary.length > 0 && (
            <div style={{ marginBottom: done.length > 0 ? '0.75rem' : 0 }}>
              <div style={{
                fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.18em',
                color:'rgba(212,177,106,0.3)', marginBottom:'0.5rem',
                fontFamily:'Cinzel, serif',
              }}>
                Missões ativas
              </div>

              <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:5 }}>
                {secondary.map(q => (
                  <li key={q.id} style={{
                    display:'flex', alignItems:'flex-start', gap:8,
                    padding:'6px 8px',
                    background:'rgba(212,177,106,0.03)',
                    border:'1px solid rgba(212,177,106,0.09)',
                    borderRadius:4,
                  }}>
                    <span style={{ fontSize:'0.75rem', flexShrink:0, marginTop:1 }}>
                      {questIcon(q.title, q.description)}
                    </span>
                    <div style={{ minWidth:0 }}>
                      <div style={{
                        fontFamily:'Cinzel, serif', fontSize:'0.74rem', fontWeight:600,
                        color:'#b8983a', letterSpacing:'0.02em',
                      }}>
                        {q.title}
                      </div>
                      {q.progress && (
                        <div style={{ fontSize:'0.65rem', color:'#7a6030', marginTop:2, lineHeight:1.4 }}>
                          ◈ {q.progress}
                        </div>
                      )}
                      {q.reward && (
                        <div style={{ fontSize:'0.63rem', color:'#5aad8a', marginTop:2 }}>
                          🎁 {q.reward}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completed / failed quests */}
          {!loading && done.length > 0 && (
            <div>
              {/* Divider */}
              <div style={{ height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.1), transparent)', margin:'0.6rem 0' }} />

              <div
                className="quest-done-toggle"
                onClick={() => setDoneOpen(o => !o)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.18em',
                  color:'rgba(212,177,106,0.28)',
                  fontFamily:'Cinzel, serif',
                  marginBottom: doneOpen ? '0.5rem' : 0,
                  transition:'color 0.2s',
                }}
              >
                <span style={{ fontSize:'0.6rem' }}>{doneOpen ? '▾' : '▸'}</span>
                Concluídas ({done.length})
              </div>

              {doneOpen && (
                <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:4 }}>
                  {done.map(q => (
                    <li key={q.id} style={{
                      display:'flex', alignItems:'center', gap:7,
                      padding:'5px 8px',
                      opacity: 0.45,
                    }}>
                      <span style={{
                        flexShrink:0,
                        width:14, height:14,
                        border:'1px solid rgba(110,231,183,0.4)',
                        borderRadius:2,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.6rem',
                        color: q.status === 'completed' ? '#6ee7b7' : '#f87171',
                      }}>
                        {q.status === 'completed' ? '✓' : '✗'}
                      </span>
                      <span style={{
                        fontSize:'0.72rem',
                        color: q.status === 'completed' ? '#5aad8a' : '#8a4040',
                        textDecoration:'line-through',
                        fontFamily:'Georgia, serif',
                        fontStyle:'italic',
                      }}>
                        {q.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
