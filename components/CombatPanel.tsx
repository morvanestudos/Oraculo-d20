"use client"
import React, { useEffect, useState } from 'react'
import type { CombatState, Combatant } from '../lib/types'
import { getCombatState, saveCombatState, clearCombatState } from '../lib/storage'

type Props = {
  campaignId: string
}

export default function CombatPanel({ campaignId }: Props) {
  const [state, setState] = useState<CombatState | null>(null)

  useEffect(() => {
    setState(getCombatState(campaignId))
  }, [campaignId])

  function refresh() {
    setState(getCombatState(campaignId))
  }

  function endCombat() {
    if (!state) return
    clearCombatState(campaignId)
    setState(null)
  }

  function hpBar(c: Combatant) {
    const pct = Math.max(0, Math.min(100, Math.round((c.hp / c.maxHp) * 100)))
    return (
      <div className="w-full bg-[#0b0b0d] rounded h-3">
        <div style={{ width: `${pct}%` }} className="h-3 bg-gradient-to-r from-arcane to-accent rounded" />
      </div>
    )
  }

  if (!state) return null

  return (
    <div className="combat-diary mb-3">
      <div className="combat-header">
        <div className="text-sm font-semibold">Combate Ativo</div>
        <div className="text-xs text-muted">Rodada {state.round} • Turno {state.turnIndex + 1}</div>
      </div>

      <div className="space-y-3">
        {state.combatants.map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${c.type === 'player' ? 'bg-arcane' : 'bg-red-600'}`} />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <div>{c.name} {c.isActive ? '•' : ''}</div>
                <div className="text-xs text-muted">Ini {c.initiative} — HP {c.hp}/{c.maxHp}</div>
              </div>
              {hpBar(c)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <button onClick={endCombat} className="px-3 py-1 rounded-full bg-red-600 text-white">Encerrar combate</button>
        <button onClick={refresh} className="px-3 py-1 rounded-full bg-[#11131a] text-muted">Atualizar</button>
      </div>
    </div>
  )
}
