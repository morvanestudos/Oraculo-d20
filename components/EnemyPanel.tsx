'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { createPusherClient } from '../lib/pusher-client'
import type { Enemy } from '../lib/types'

type Props = { campaignId: string }

const PRESET_ENCOUNTER = [
  {
    name: 'Corvo Possuído',
    description: 'Um corvo com olhos vermelhos e movimentos erráticos. Ataca em bando.',
    hp: 8, maxHp: 8, armorClass: 12, initiative: 0, xpReward: 20,
    abilities: [{ name: 'Bico Envenenado', description: 'Ataque básico com bico.', damageDice: '1d4', bonus: 1 }],
    loot: [{ name: 'Pena Enegrecida', type: 'item' as const, quantity: 1, rarity: 'incomum' as const }],
  },
  {
    name: 'Corvo Possuído',
    description: 'Um corvo com olhos vermelhos e movimentos erráticos. Ataca em bando.',
    hp: 8, maxHp: 8, armorClass: 12, initiative: 0, xpReward: 20,
    abilities: [{ name: 'Bico Envenenado', description: 'Ataque básico com bico.', damageDice: '1d4', bonus: 1 }],
    loot: [],
  },
  {
    name: 'Cultista Ferido',
    description: 'Membro da seita, enfraquecido mas fanático. Carrega símbolo do culto.',
    hp: 14, maxHp: 14, armorClass: 13, initiative: 0, xpReward: 50,
    abilities: [
      { name: 'Faca Ritual', description: 'Golpe básico com faca de cerimônia.', damageDice: '1d6', bonus: 2 },
      { name: 'Grito do Culto', description: 'Grita em pânico — pode chamar reforços.', damageDice: '0', bonus: 0 },
    ],
    loot: [
      { name: 'Símbolo do Culto', type: 'quest' as const, quantity: 1, rarity: 'raro' as const },
      { name: '8 Moedas Antigas', type: 'gold' as const, quantity: 8, rarity: 'comum' as const },
    ],
  },
]

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(maxHp, 1)) * 100))
  const color = pct > 50 ? '#ef4444' : pct > 25 ? '#f59e0b' : '#6b7280'
  return (
    <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function EnemyPanel({ campaignId }: Props) {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchEnemies = useCallback(async () => {
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/enemies`)
      if (r.ok) setEnemies(await r.json())
    } catch { /* silent */ }
  }, [campaignId])

  useEffect(() => { fetchEnemies() }, [fetchEnemies])

  // Real-time updates
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`campaign-${campaignId}`)
    channel.bind('enemies-updated', (updated: Enemy[]) => {
      setEnemies(prev => {
        const map = new Map(prev.map(e => [e.id, e]))
        updated.forEach(e => map.set(e.id, e))
        return Array.from(map.values()).filter(e => e.active)
      })
    })
    return () => { channel.unbind('enemies-updated'); pusher.unsubscribe(`campaign-${campaignId}`) }
  }, [campaignId])

  async function generateEncounter() {
    setGenerating(true)
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/enemies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enemies: PRESET_ENCOUNTER }),
      })
      if (r.ok) {
        const created: Enemy[] = await r.json()
        setEnemies(prev => [...prev, ...created])
        // Post system message
        await fetch(`/api/campaigns/${campaignId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: 'Sistema', role: 'system',
            content: `👹 Encontro iniciado! Inimigos: ${created.map(e => e.name).join(', ')}`,
          }),
        }).catch(() => {})
      }
    } finally { setGenerating(false) }
  }

  const alive = enemies.filter(e => e.active && e.status !== 'dead')
  const dead  = enemies.filter(e => !e.active || e.status === 'dead')

  return (
    <div className="panel glass rounded-lg overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span>👹</span>
          <span className="font-semibold text-sm" style={{ color: '#f87171', fontFamily: 'Cinzel, serif' }}>
            Inimigos
            {alive.length > 0 && (
              <span className="ml-2 text-xs" style={{ color: 'rgba(239,68,68,0.6)' }}>({alive.length})</span>
            )}
          </span>
        </div>
        <button
          onClick={generateEncounter}
          disabled={generating}
          title="Gerar encontro de teste"
          style={{
            fontSize: '0.6rem', letterSpacing: '0.06em',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'rgba(248,113,113,0.7)',
            borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
            opacity: generating ? 0.5 : 1,
          }}
        >
          {generating ? '...' : '⚔️ Gerar Encontro'}
        </button>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {alive.length === 0 && dead.length === 0 && (
          <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Nenhuma ameaça visível.
          </p>
        )}

        {/* Alive enemies */}
        {alive.map(e => (
          <div key={e.id} className="rounded-lg p-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <div className="text-sm font-semibold" style={{ color: '#f87171' }}>{e.name}</div>
                {e.description && (
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {e.description.slice(0, 80)}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-bold" style={{ color: '#f87171' }}>{e.hp}/{e.maxHp}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>CA {e.armorClass}</div>
              </div>
            </div>
            <HpBar hp={e.hp} maxHp={e.maxHp} />
            {e.abilities && e.abilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.abilities.slice(0, 2).map((ab, i) => (
                  <span key={i} style={{
                    fontSize: '0.55rem', color: 'rgba(248,113,113,0.6)',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 3, padding: '1px 5px',
                  }}>{ab.name}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Dead enemies (collapsed) */}
        {dead.length > 0 && (
          <div className="pt-1">
            {dead.map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1"
                style={{ color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span>☠️ {e.name}</span>
                <span style={{ fontSize: '0.6rem' }}>+{e.xpReward ?? 0} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
