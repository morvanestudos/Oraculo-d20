'use client'
import React, { useEffect, useState } from 'react'
import type { ActiveNPC, CampaignMemory } from '../lib/types'

type Props = {
  campaignId: string
  campaignTitle?: string
}

// Mood → display label + color
const MOOD_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  desconfiado:   { label: 'Desconfiado',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  aflita:        { label: 'Aflita',        color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  aflito:        { label: 'Aflito',        color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  desesperado:   { label: 'Desesperado',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  ansioso:       { label: 'Ansioso',       color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  nervoso:       { label: 'Nervoso',       color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  neutro:        { label: 'Neutro',        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  amigável:      { label: 'Amigável',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  aliado:        { label: 'Aliado',        color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  hostil:        { label: 'Hostil',        color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  misterioso:    { label: 'Misterioso',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  assustado:     { label: 'Assustado',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  indiferente:   { label: 'Indiferente',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
}

function moodStyle(mood: string) {
  const key = mood.toLowerCase().trim()
  return MOOD_STYLE[key] ?? {
    label: mood,
    color: 'rgba(212,177,106,0.7)',
    bg: 'rgba(212,177,106,0.08)',
  }
}

// Initials avatar — generates from NPC name
function NpcAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div style={{
      width: 36, height: 36, flexShrink: 0, borderRadius: 4,
      background: 'linear-gradient(145deg, rgba(40,24,8,0.98), rgba(24,14,4,0.96))',
      border: '1px solid rgba(212,177,106,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,177,106,0.08)',
    }}>
      <span style={{
        fontFamily: 'Cinzel, serif', fontSize: '0.75rem', fontWeight: 700,
        color: 'rgba(212,177,106,0.65)', letterSpacing: '0.05em',
      }}>
        {initials || '?'}
      </span>
    </div>
  )
}

function NpcCard({ npc }: { npc: ActiveNPC }) {
  const ms = moodStyle(npc.mood)

  return (
    <div style={{
      padding: '0.7rem 0.8rem',
      background: 'rgba(212,177,106,0.03)',
      border: '1px solid rgba(212,177,106,0.11)',
      borderRadius: 5,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <NpcAvatar name={npc.name} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + mood badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: '0.8rem', fontWeight: 700,
              color: '#d4b16a', letterSpacing: '0.03em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {npc.name}
            </div>
            <div style={{
              flexShrink: 0,
              padding: '1px 6px',
              background: ms.bg,
              border: `1px solid ${ms.color}33`,
              borderRadius: 3,
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: ms.color,
              fontFamily: 'Cinzel, serif',
            }}>
              {ms.label}
            </div>
          </div>

          {/* Role */}
          <div style={{ fontSize: '0.67rem', color: '#6a5030', marginBottom: 5 }}>
            {npc.role}
          </div>

          {/* Known info */}
          {npc.knownInfo && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 5,
              padding: '4px 7px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 3,
            }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(212,177,106,0.35)', flexShrink: 0, marginTop: 1 }}>💬</span>
              <span style={{
                fontSize: '0.68rem', color: '#7a6040',
                fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.4,
              }}>
                {npc.knownInfo}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fallback NPCs for A Taverna dos Corvos
const TAVERNA_FALLBACK: ActiveNPC[] = [
  {
    name: 'Arvik, o Taverneiro',
    role: 'Dono da Taverna dos Corvos',
    mood: 'desconfiado',
    knownInfo: 'Ouviu cantos vindos da floresta ao norte nas noites de desaparecimento.',
  },
  {
    name: 'Elenna, a Viúva',
    role: 'Moradora da vila',
    mood: 'aflita',
    knownInfo: 'Seu marido desapareceu perto do poço antigo há três noites.',
  },
]

export default function NpcPanel({ campaignId, campaignTitle }: Props) {
  const [npcs, setNpcs] = useState<ActiveNPC[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchNpcs() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/memory`)
      if (res.ok) {
        const mem: CampaignMemory = await res.json()
        if (Array.isArray(mem.activeNPCs) && mem.activeNPCs.length > 0) {
          setNpcs(mem.activeNPCs)
        } else {
          // Use fallback if memory has no NPCs yet
          const isTaverna = (campaignTitle ?? '').toLowerCase().includes('taverna dos corvos')
          setNpcs(isTaverna ? TAVERNA_FALLBACK : [])
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchNpcs()
    const interval = setInterval(fetchNpcs, 45_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  if (!loading && npcs.length === 0) return null

  return (
    <div style={{
      background: 'linear-gradient(175deg, rgba(20,12,4,0.98), rgba(10,6,2,0.96))',
      border: '1px solid rgba(212,177,106,0.18)',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,177,106,0.07)',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 0.95rem 0.6rem',
        borderBottom: '1px solid rgba(212,177,106,0.1)',
        background: 'rgba(22,13,4,0.98)',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{ fontSize: '0.82rem' }}>🧑‍🤝‍🧑</span>
        <span style={{
          fontFamily: 'Cinzel, serif', fontSize: '0.68rem', fontWeight: 700,
          color: '#c4a870', textTransform: 'uppercase', letterSpacing: '0.2em',
          textShadow: '0 0 8px rgba(212,177,106,0.2)',
        }}>
          Personagens Conhecidos
        </span>
        {!loading && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.58rem',
            background: 'rgba(212,177,106,0.08)',
            border: '1px solid rgba(212,177,106,0.16)',
            borderRadius: 10, padding: '1px 6px',
            color: 'rgba(212,177,106,0.5)', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em',
          }}>
            {npcs.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0.75rem 0.8rem' }}>
        {loading ? (
          <p style={{ color: '#5a4820', fontSize: '0.72rem', fontStyle: 'italic', margin: 0 }}>
            Consultando registros...
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {npcs.map((npc, i) => <NpcCard key={`${npc.name}-${i}`} npc={npc} />)}
          </div>
        )}
      </div>
    </div>
  )
}
