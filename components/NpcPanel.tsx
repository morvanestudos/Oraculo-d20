'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { getOfficialCampaign } from '../lib/officialCampaigns'
import { createPusherClient } from '../lib/pusher-client'
import type { Npc } from '../lib/types'

type Props = {
  campaignId: string
  campaignTitle?: string
}

const GENERIC_INITIAL_NPC: Omit<Npc, 'id' | 'campaignId' | 'active'> = {
  name: 'Viajante Misterioso',
  role: 'Desconhecido',
  mood: 'observador',
  trust: 0,
  fear: 1,
  knownInfo: 'Parece saber mais sobre a região do que revela.',
  secrets: 'Carrega uma pista ligada ao conflito principal da campanha.',
}

// ── Mood styles ───────────────────────────────────────────────────────────────

const MOOD_STYLE: Record<string, { color: string; bg: string }> = {
  desconfiado: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  desesperado: { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  ansioso:     { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  nervoso:     { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  misterioso:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  neutro:      { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  amigável:    { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  aliado:      { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  hostil:      { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  assustado:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

function getMoodStyle(mood: string) {
  return MOOD_STYLE[mood.toLowerCase()] ?? { color: 'rgba(212,177,106,0.7)', bg: 'rgba(212,177,106,0.08)' }
}

// ── Trust/Fear bar ────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ((value + max) / (max * 2)) * 100))
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── NPC card ──────────────────────────────────────────────────────────────────

function NpcCard({ npc }: { npc: Npc }) {
  const ms = getMoodStyle(npc.mood)
  const initials = npc.name.split(/[\s,]+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div style={{
      padding: '0.65rem 0.75rem',
      background: 'rgba(212,177,106,0.03)',
      border: '1px solid rgba(212,177,106,0.1)',
      borderRadius: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, flexShrink: 0, borderRadius: 4,
          background: 'linear-gradient(145deg, rgba(40,24,8,0.98), rgba(24,14,4,0.96))',
          border: '1px solid rgba(212,177,106,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(212,177,106,0.6)' }}>
            {initials || '?'}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + mood */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 1 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', fontWeight: 700, color: '#d4b16a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {npc.name}
            </div>
            <span style={{ flexShrink: 0, padding: '1px 5px', background: ms.bg, border: `1px solid ${ms.color}33`, borderRadius: 3, fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: ms.color }}>
              {npc.mood}
            </span>
          </div>

          {/* Role */}
          {npc.role && (
            <div style={{ fontSize: '0.62rem', color: '#6a5030', marginBottom: 4 }}>{npc.role}</div>
          )}

          {/* Trust + Fear bars */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.55rem', color: '#4ade80', width: 36 }}>Confia</span>
            <MiniBar value={npc.trust} max={10} color="#4ade80" />
            <span style={{ fontSize: '0.55rem', color: '#f87171', width: 24 }}>Medo</span>
            <MiniBar value={npc.fear} max={10} color="#f87171" />
          </div>

          {/* Known info */}
          {npc.knownInfo && (
            <div style={{ display: 'flex', gap: 4, padding: '3px 6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
              <span style={{ fontSize: '0.55rem', color: 'rgba(212,177,106,0.35)', flexShrink: 0, marginTop: 1 }}>💬</span>
              <span style={{ fontSize: '0.65rem', color: '#7a6040', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.4 }}>
                {npc.knownInfo}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function NpcPanel({ campaignId, campaignTitle }: Props) {
  const [npcs, setNpcs] = useState<Npc[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)
  const [creatingInitialNpc, setCreatingInitialNpc] = useState(false)

  const officialCampaign = getOfficialCampaign(campaignTitle)

  const fetchNpcs = useCallback(async () => {
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/npcs`)
      if (!r.ok) return
      const data: Npc[] = await r.json()

      if (data.length === 0 && officialCampaign && !seeded) {
        // Auto-seed official campaign NPCs
        setSeeded(true)
        const seedR = await fetch(`/api/campaigns/${campaignId}/npcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ npcs: officialCampaign.initialNpcs }),
        })
        if (seedR.ok) setNpcs(await seedR.json())
      } else {
        setNpcs(data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [campaignId, officialCampaign, seeded])

  useEffect(() => { fetchNpcs() }, [fetchNpcs])

  async function createInitialNpc() {
    if (creatingInitialNpc) return
    setCreatingInitialNpc(true)
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/npcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcs: [GENERIC_INITIAL_NPC] }),
      })
      if (r.ok) setNpcs(await r.json())
    } catch { /* silent */ }
    setCreatingInitialNpc(false)
  }

  // Real-time updates
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`campaign-${campaignId}`)
    channel.bind('npcs-updated', (updated: Npc[]) => {
      setNpcs(prev => {
        const map = new Map(prev.map(n => [n.id, n]))
        updated.forEach(n => map.set(n.id, n))
        return Array.from(map.values()).filter(n => n.active)
      })
    })
    return () => { channel.unbind('npcs-updated'); pusher.unsubscribe(`campaign-${campaignId}`) }
  }, [campaignId])

  return (
    <div style={{
      background: 'linear-gradient(175deg, rgba(20,12,4,0.98), rgba(10,6,2,0.96))',
      border: '1px solid rgba(212,177,106,0.18)',
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{ padding: '0.7rem 0.9rem 0.55rem', borderBottom: '1px solid rgba(212,177,106,0.1)', background: 'rgba(22,13,4,0.98)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: '0.8rem' }}>🧑‍🤝‍🧑</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', fontWeight: 700, color: '#c4a870', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
          NPCs Conhecidos
        </span>
        {!loading && (
          <span style={{ marginLeft: 'auto', fontSize: '0.55rem', background: 'rgba(212,177,106,0.08)', border: '1px solid rgba(212,177,106,0.16)', borderRadius: 10, padding: '1px 5px', color: 'rgba(212,177,106,0.5)' }}>
            {npcs.length}
          </span>
        )}
      </div>
      <div style={{ padding: '0.7rem 0.75rem' }}>
        {loading ? (
          <p style={{ color: '#5a4820', fontSize: '0.7rem', fontStyle: 'italic', margin: 0 }}>Consultando registros...</p>
        ) : npcs.length === 0 ? (
          <div style={{
            padding: '0.8rem 0.75rem',
            background: 'rgba(212,177,106,0.025)',
            border: '1px dashed rgba(212,177,106,0.14)',
            borderRadius: 5,
          }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', fontWeight: 700, color: '#d4b16a', marginBottom: 5 }}>
              Nenhum NPC foi encontrado nesta campanha ainda.
            </div>
            <p style={{ color: '#7a6040', fontSize: '0.68rem', lineHeight: 1.5, margin: '0 0 0.75rem', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              Converse com moradores, inimigos ou viajantes para que o Mestre registre novos personagens importantes.
            </p>
            <button
              type="button"
              onClick={createInitialNpc}
              disabled={creatingInitialNpc}
              style={{
                width: '100%',
                padding: '0.48rem 0.65rem',
                background: creatingInitialNpc ? 'rgba(212,177,106,0.06)' : 'rgba(212,177,106,0.1)',
                border: '1px solid rgba(212,177,106,0.24)',
                borderRadius: 4,
                color: '#c8a85a',
                fontSize: '0.62rem',
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: creatingInitialNpc ? 'wait' : 'pointer',
              }}
            >
              {creatingInitialNpc ? 'Registrando...' : 'Gerar NPC inicial'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {npcs.map(npc => <NpcCard key={npc.id} npc={npc} />)}
          </div>
        )}
      </div>
    </div>
  )
}
