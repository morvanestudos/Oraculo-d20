'use client'
import React, { useEffect, useState, useCallback } from 'react'
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
  const myPlayerId = getPlayerId()

  const applyState = useCallback((state: TurnState | null) => {
    setTurnState(state)
    onTurnStateChange?.(state)
  }, [onTurnStateChange])

  // Initial fetch
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/turns`)
      .then(r => r.json())
      .then(data => applyState(data?.active ? data : null))
      .catch(() => {})
  }, [campaignId, applyState])

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

  const BTN = {
    base: 'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
    gold: 'text-xs font-semibold px-3 py-1.5 rounded-lg',
  }

  return (
    <div
      className="panel glass rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(212,177,106,0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span>⚔️</span>
          <span className="font-semibold text-sm tracking-wide" style={{ color: '#d4b16a', fontFamily: 'Cinzel, serif' }}>
            {turnState?.active ? `Turno — Rodada ${turnState.round}` : 'Modo Exploração'}
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={turnState?.active
            ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
            : { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
        >
          {turnState?.active ? 'Turno ativo' : 'Livre'}
        </span>
      </div>

      <div className="px-4 pb-4 space-y-3">
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

                  {/* Character + player */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold truncate"
                      style={{ color: isCurrent ? '#d4b16a' : 'rgba(255,255,255,0.8)' }}
                    >
                      {entry.characterName}
                      {isMe && (
                        <span style={{ color: '#a78bfa', fontSize: '0.6rem', marginLeft: 4 }}>(você)</span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
                      {entry.playerName}
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
              <button
                onClick={nextTurn}
                disabled={loading || !isMyTurn}
                className={BTN.base}
                title={!isMyTurn ? 'Aguarde sua vez' : 'Encerrar turno e passar para o próximo'}
                style={{
                  background: isMyTurn ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                  border: isMyTurn ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  color: isMyTurn ? '#4ade80' : 'rgba(255,255,255,0.25)',
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? '...' : '⏭️ Encerrar meu turno'}
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
      </div>
    </div>
  )
}
