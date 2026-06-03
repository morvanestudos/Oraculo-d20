'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPusherClient } from '../lib/pusher-client'
import { getPlayerId } from '../lib/storage'
import type { TurnState, TurnEntry } from '../lib/types'

type Props = {
  campaignId: string
  onTurnStateChange?: (state: TurnState | null) => void
}

export default function TurnOrderPanel({ campaignId, onTurnStateChange }: Props) {
  const [turnState, setTurnState] = useState<TurnState | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const myPlayerId = getPlayerId()

  const applyState = useCallback((state: TurnState | null) => {
    setTurnState(state)
    onTurnStateChange?.(state)
    // Auto-expand when turns become active
    if (state?.active) setExpanded(true)
  }, [onTurnStateChange])

  // Initial fetch
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/turns`)
      .then(r => r.json())
      .then(data => applyState(data?.active ? data : null))
      .catch(() => {})
  }, [campaignId, applyState])

  // ── Auto-execute enemy turns ─────────────────────────────────────────────
  const enemyActingRef = useRef(false)
  useEffect(() => {
    if (!turnState?.active) return
    const current = turnState.turnOrder[turnState.currentTurnIndex]
    if (!current || current.type !== 'enemy' || current.hasActed) return
    if (enemyActingRef.current) return
    enemyActingRef.current = true

    // Delay for drama, then execute enemy action
    const tid = setTimeout(async () => {
      try {
        await executeEnemyTurn(campaignId, current, turnState)
      } finally {
        enemyActingRef.current = false
      }
    }, 1800)
    return () => { clearTimeout(tid); enemyActingRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnState?.currentTurnIndex, turnState?.round, turnState?.active])

  // Pusher subscription
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`campaign-${campaignId}`)
    channel.bind('turn-updated', (data: TurnState) => {
      applyState(data?.active ? data : null)
    })
    return () => {
      channel.unbind('turn-updated')
      pusher.unsubscribe(`campaign-${campaignId}`)
    }
  }, [campaignId, applyState])

  async function startTurns() {
    setLoading(true)
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/turns/start`, { method: 'POST' })
      const data = await r.json()
      if (data.active) applyState(data)
      else alert(data.error ?? 'Falha ao iniciar turnos.')
    } finally { setLoading(false) }
  }

  async function nextTurn() {
    setLoading(true)
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/turns/next`, { method: 'POST' })
      const data = await r.json()
      if (data.active !== undefined) applyState(data.active ? data : null)
    } finally { setLoading(false) }
  }

  async function skipTurn() {
    if (!currentEntry || !isMyTurn) return
    setLoading(true)
    try {
      // Post skip message then advance
      await fetch(`/api/campaigns/${campaignId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Sistema',
          role: 'system',
          content: `⏩ ${currentEntry.characterName} hesita e guarda sua ação.`,
        }),
      }).catch(() => {})
      const r = await fetch(`/api/campaigns/${campaignId}/turns/next`, { method: 'POST' })
      const data = await r.json()
      if (data.active !== undefined) applyState(data.active ? data : null)
    } finally { setLoading(false) }
  }

  async function endTurns() {
    setLoading(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/turns/end`, { method: 'POST' })
      applyState(null)
    } finally { setLoading(false) }
  }

  const currentEntry: TurnEntry | null = turnState?.active
    ? (turnState.turnOrder[turnState.currentTurnIndex] ?? null)
    : null
  const isMyTurn = !!currentEntry && currentEntry.playerId === myPlayerId

  // ── Turn timer ─────────────────────────────────────────────────────────────
  const TURN_SECONDS = 60
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset timer whenever the active actor changes
  useEffect(() => {
    setTimeLeft(TURN_SECONDS)
    if (timerRef.current) clearInterval(timerRef.current)
    if (!turnState?.active) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [turnState?.active, turnState?.currentTurnIndex, turnState?.round])

  const timerPct   = (timeLeft / TURN_SECONDS) * 100
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : '#4ade80'
  const timerGlow  = timeLeft <= 10
    ? '0 0 8px rgba(239,68,68,0.45)'
    : timeLeft <= 30
    ? '0 0 6px rgba(245,158,11,0.35)'
    : '0 0 4px rgba(74,222,128,0.2)'

  const BTN = {
    base: 'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
    gold: 'text-xs font-semibold px-3 py-1.5 rounded-lg',
  }

  return (
    <div
      className="panel glass rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(212,177,106,0.2)' }}
    >
      {/* Header — clickable to expand/collapse */}
      <button
        className="w-full flex items-center justify-between px-4 pt-4 pb-3 text-left"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span>⚔️</span>
          <div>
            <div className="font-semibold text-sm tracking-wide" style={{ color: '#d4b16a', fontFamily: 'Cinzel, serif' }}>
              {turnState?.active ? `Turno — Rodada ${turnState.round}` : 'Modo Exploração'}
            </div>
            {/* Compact subtitle when collapsed */}
            {!expanded && turnState?.active && currentEntry && (
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Vez de {currentEntry.characterName}
              </div>
            )}
            {!expanded && !turnState?.active && (
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Toque para iniciar turnos
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={turnState?.active
              ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
              : { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            {turnState?.active ? 'Ativo' : 'Livre'}
          </span>
          <span style={{ color: 'rgba(212,177,106,0.5)', fontSize: '0.7rem', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </button>

      {/* Timer bar — always visible when turns are active */}
      {turnState?.active && (
        <div className="px-4 pb-3">
          {/* Row: time label + warning */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: timerColor, textShadow: timerGlow }}>
              ⏱ {timeLeft}s
            </span>
            {timeLeft <= 10 && timeLeft > 0 && (
              <span className="text-xs animate-pulse" style={{ color: '#ef4444' }}>
                ⚠️ O tempo está acabando
              </span>
            )}
            {timeLeft === 0 && (
              <span className="text-xs" style={{ color: '#ef4444' }}>
                Tempo esgotado — pule ou aja
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%', height: 5, borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: `${timerPct}%`,
              height: '100%',
              borderRadius: 3,
              background: timerColor,
              boxShadow: timerGlow,
              transition: 'width 1s linear, background 0.5s ease, box-shadow 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {expanded && <div className="px-4 pb-4 space-y-3">
        {/* Turn order list */}
        {turnState?.active && turnState.turnOrder.length > 0 && (
          <div className="space-y-1.5">
            {turnState.turnOrder.map((entry, i) => {
              const isCurrent = i === turnState.currentTurnIndex
              const isMe = entry.playerId === myPlayerId
              return (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                  style={{
                    background: isCurrent
                      ? 'rgba(212,177,106,0.1)'
                      : entry.hasActed
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.04)',
                    border: isCurrent
                      ? '1px solid rgba(212,177,106,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                    opacity: entry.hasActed && !isCurrent ? 0.5 : 1,
                  }}
                >
                  {/* Status icon */}
                  <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                    {entry.hasActed ? '✓' : isCurrent ? '▶' : '◦'}
                  </span>

                  {/* Initiative */}
                  <span
                    className="text-xs font-bold w-6 text-right flex-shrink-0"
                    style={{ color: isCurrent ? '#d4b16a' : 'rgba(255,255,255,0.3)' }}
                  >
                    {entry.initiative}
                  </span>

                  {/* Character / Enemy name */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold truncate"
                      style={{
                        color: entry.type === 'enemy'
                          ? (isCurrent ? '#f87171' : 'rgba(248,113,113,0.6)')
                          : (isCurrent ? '#d4b16a' : 'rgba(255,255,255,0.8)'),
                      }}
                    >
                      {entry.type === 'enemy' ? `👹 ${entry.enemyName}` : entry.characterName}
                      {isMe && (
                        <span style={{ color: '#a78bfa', fontSize: '0.6rem', marginLeft: 4 }}>(você)</span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
                      {entry.type === 'enemy' ? 'inimigo' : entry.playerName}
                    </div>
                  </div>

                  {/* Current glow */}
                  {isCurrent && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(212,177,106,0.15)', color: '#d4b16a', fontSize: '0.6rem' }}
                    >
                      vez
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* No turns active placeholder */}
        {!turnState?.active && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Todos podem agir livremente. Inicie turnos para organizar combate ou cenas críticas.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!turnState?.active && (
            <button
              onClick={startTurns}
              disabled={loading}
              className={BTN.gold}
              style={{
                background: 'linear-gradient(135deg, rgba(212,177,106,0.2), rgba(124,58,237,0.15))',
                border: '1px solid rgba(212,177,106,0.3)',
                color: '#d4b16a',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Aguarde...' : '⚔️ Iniciar Turnos'}
            </button>
          )}

          {turnState?.active && (
            <>
              {/* "Pular ação" — manual escape hatch (auto-advance handles the normal case) */}
              <button
                onClick={skipTurn}
                disabled={loading || !isMyTurn}
                className={BTN.base}
                title={!isMyTurn ? 'Aguarde sua vez' : 'Passar a vez sem realizar ação'}
                style={{
                  background: isMyTurn ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                  border: isMyTurn ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: isMyTurn ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? '...' : '⏩ Pular ação'}
              </button>

              <button
                onClick={endTurns}
                disabled={loading}
                className={BTN.base}
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'rgba(248,113,113,0.7)',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                🕊️ Finalizar Turnos
              </button>
            </>
          )}
        </div>

        {/* My turn indicator */}
        {turnState?.active && isMyTurn && (
          <div
            className="text-xs text-center py-2 rounded-lg animate-pulse"
            style={{
              background: 'rgba(212,177,106,0.08)',
              border: '1px solid rgba(212,177,106,0.25)',
              color: '#d4b16a',
              fontWeight: 600,
            }}
          >
            ✦ É a sua vez de agir, {currentEntry?.characterName}!
          </div>
        )}

        {/* Waiting indicator */}
        {turnState?.active && !isMyTurn && currentEntry && (
          <div
            className="text-xs text-center py-1.5 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Aguardando {currentEntry.characterName}...
          </div>
        )}
      </div>}
    </div>
  )
}

// ── Enemy turn auto-executor ──────────────────────────────────────────────────

async function executeEnemyTurn(campaignId: string, entry: TurnEntry, turnState: TurnState) {
  // Find a living player character to target
  const players = turnState.turnOrder.filter(e => (e.type ?? 'player') === 'player')
  if (!players.length) {
    await advanceTurn(campaignId)
    return
  }
  const target = players[Math.floor(Math.random() * players.length)]
  const targetName = target.characterName ?? 'Aventureiro'
  const enemyName  = entry.enemyName ?? 'Inimigo'

  // Attack roll: d20 + small modifier
  const d20        = Math.floor(Math.random() * 20) + 1
  const atkBonus   = 2
  const totalAtk   = d20 + atkBonus

  // Fetch target character's AC via API
  let targetAC = 12
  if (target.characterId) {
    try {
      const r = await fetch(`/api/characters/${target.characterId}`)
      if (r.ok) { const data = await r.json(); targetAC = data.ac ?? 12 }
    } catch { /* use default */ }
  }

  const hit = d20 === 20 || (d20 !== 1 && totalAtk >= targetAC)
  const crit = d20 === 20
  const miss = d20 === 1

  let msgLines: string[]

  if (miss) {
    msgLines = [
      `👹 ${enemyName} tenta atacar ${targetName}!`,
      `Ataque: d20 ${d20} + ${atkBonus} = **${totalAtk}**`,
      `💀 Falha crítica! O ataque sai terrivelmente errado.`,
    ]
    await postSystemMessage(campaignId, msgLines.join('\n'))
  } else if (!hit) {
    msgLines = [
      `👹 ${enemyName} ataca ${targetName}`,
      `Ataque: d20 ${d20} + ${atkBonus} = **${totalAtk}**  |  CA ${targetAC}`,
      `🛡️ Errou — ${targetName} desvia.`,
    ]
    await postSystemMessage(campaignId, msgLines.join('\n'))
  } else {
    // Roll damage: 1d6 + 1
    const diceRoll = Math.floor(Math.random() * 6) + 1
    const dmgBonus = crit ? 2 : 1
    const dmg      = crit ? (diceRoll + Math.floor(Math.random() * 6) + 1) + dmgBonus : diceRoll + dmgBonus

    msgLines = [
      `👹 ${enemyName} ataca ${crit ? '🌟 CRÍTICO! ' : ''}${targetName}`,
      `Ataque: d20 ${d20} + ${atkBonus} = **${totalAtk}**  |  CA ${targetAC}  ✅ Acertou`,
      `Dano: ${crit ? '2d6' : '1d6'}+${dmgBonus} = **${dmg}**`,
    ]

    // Apply damage to character
    if (target.characterId) {
      try {
        const r = await fetch(`/api/characters/${target.characterId}/hp`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hpChange: -dmg, reason: `Ataque de ${enemyName}`, campaignId: Number(campaignId) }),
        })
        if (r.ok) {
          const updated = await r.json()
          const newHp = updated.hp ?? '?'
          const maxHp = updated.maxHp ?? '?'
          msgLines.push(`HP de ${targetName}: ${newHp}/${maxHp}${newHp === 0 ? ' ☠️' : ''}`)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('oraculo:character-updated', {
              detail: { characterId: String(target.characterId), hp: newHp },
            }))
          }
        }
      } catch { /* non-fatal */ }
    }

    await postSystemMessage(campaignId, msgLines.join('\n'))
  }

  await advanceTurn(campaignId)
}

async function postSystemMessage(campaignId: string, content: string) {
  await fetch(`/api/campaigns/${campaignId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'Sistema', role: 'system', content }),
  }).catch(() => {})
}

async function advanceTurn(campaignId: string) {
  await fetch(`/api/campaigns/${campaignId}/turns/next`, { method: 'POST' }).catch(() => {})
}
