'use client'

import React, { useEffect, useState } from 'react'
import { createPusherClient } from '../lib/pusher-client'
import type { Quest } from '../lib/types'

type Props = {
  campaignId: string
}

const STATUS_ICON: Record<Quest['status'], string> = {
  active: '⚔',
  completed: '✓',
  failed: '✗'
}

const STATUS_COLOR: Record<Quest['status'], string> = {
  active: '#e8c840',
  completed: '#6ee7b7',
  failed: '#f87171'
}

export default function QuestLog({ campaignId }: Props) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchQuests() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/quests`)
        if (res.ok && mounted) {
          setQuests(await res.json())
        }
      } catch {
        // silent — quests are non-critical
      } finally {
        if (mounted) setLoading(false)
      }
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

  const active = quests.filter(q => q.status === 'active')
  const done = quests.filter(q => q.status === 'completed' || q.status === 'failed')

  if (loading) {
    return (
      <div style={containerStyle}>
        <h3 style={headerStyle}>📜 Diário de Missões</h3>
        <p style={{ color: '#7c6a30', fontSize: '0.75rem', fontStyle: 'italic' }}>Carregando...</p>
      </div>
    )
  }

  if (quests.length === 0) {
    return (
      <div style={containerStyle}>
        <h3 style={headerStyle}>📜 Diário de Missões</h3>
        <p style={{ color: '#7c6a30', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>
          Nenhuma missão registrada ainda. A aventura aguarda.
        </p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>📜 Diário de Missões</h3>

      {active.length > 0 && (
        <section>
          <p style={sectionLabelStyle}>Em andamento</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(q => (
              <li key={q.id} style={questItemStyle('active')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: STATUS_COLOR.active, fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>
                    {STATUS_ICON.active}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={questTitleStyle('active')}>{q.title}</p>
                    {q.description && (
                      <p style={questTextStyle}>{q.description}</p>
                    )}
                    {q.progress && (
                      <p style={{ ...questTextStyle, color: '#b8960c', marginTop: 4 }}>
                        Progresso: {q.progress}
                      </p>
                    )}
                    {q.reward && (
                      <p style={{ ...questTextStyle, color: '#6ee7b7', marginTop: 4 }}>
                        Recompensa: {q.reward}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section style={{ marginTop: active.length > 0 ? 14 : 0 }}>
          <p style={sectionLabelStyle}>Concluídas</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {done.map(q => (
              <li key={q.id} style={questItemStyle(q.status)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: STATUS_COLOR[q.status], fontSize: '0.85rem', flexShrink: 0 }}>
                    {STATUS_ICON[q.status]}
                  </span>
                  <p style={questTitleStyle(q.status)}>{q.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #110900 0%, #0c0600 100%)',
  border: '1px solid #7c5c10',
  borderRadius: 4,
  padding: '14px 14px 12px',
  fontFamily: 'Georgia, serif',
}

const headerStyle: React.CSSProperties = {
  color: '#d4af37',
  fontSize: '0.8rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
  textShadow: '0 0 8px rgba(212,175,55,0.35)',
}

const sectionLabelStyle: React.CSSProperties = {
  color: '#7c6a30',
  fontSize: '0.65rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}

function questItemStyle(status: Quest['status']): React.CSSProperties {
  return {
    background: status === 'active'
      ? 'linear-gradient(135deg, #1a1000 0%, #221500 100%)'
      : 'rgba(255,255,255,0.02)',
    border: `1px solid ${status === 'active' ? '#3d2e08' : '#1f1f1f'}`,
    borderRadius: 3,
    padding: '8px 10px',
    opacity: status === 'active' ? 1 : 0.55,
  }
}

function questTitleStyle(status: Quest['status']): React.CSSProperties {
  return {
    color: STATUS_COLOR[status],
    fontSize: '0.78rem',
    fontWeight: 'bold',
    margin: 0,
    textDecoration: status !== 'active' ? 'line-through' : 'none',
    textShadow: status === 'active' ? '0 0 6px rgba(232,200,64,0.2)' : 'none',
  }
}

const questTextStyle: React.CSSProperties = {
  color: '#9e8a50',
  fontSize: '0.7rem',
  margin: '2px 0 0',
  lineHeight: 1.4,
}
