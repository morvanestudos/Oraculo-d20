'use client'
import React, { useEffect, useState } from 'react'
import type { CampaignMemory } from '../lib/types'
import { getCampaignActs, detectCampaignAct } from '../lib/campaignActs'

type Props = {
  campaignId: string
  campaignTitle?: string
}

type ActStatus = 'completed' | 'current' | 'locked'

function getActStatus(actNumber: number, currentAct: number): ActStatus {
  if (actNumber < currentAct) return 'completed'
  if (actNumber === currentAct) return 'current'
  return 'locked'
}

export default function CampaignActsPanel({ campaignId, campaignTitle }: Props) {
  const [memory, setMemory] = useState<CampaignMemory | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function fetchMemory() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/memory`)
        if (res.ok) {
          const data = await res.json()
          setMemory(data)
        }
      } catch { /* silently fail — panel degrades gracefully */ }
    }
    fetchMemory()
    const interval = setInterval(fetchMemory, 30_000)
    return () => clearInterval(interval)
  }, [campaignId])

  const acts = getCampaignActs(campaignTitle)
  const currentAct = detectCampaignAct(campaignTitle, memory)

  return (
    <div
      className="panel glass rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(212,177,106,0.3)' }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1rem' }}>📜</span>
          <span
            className="font-semibold text-sm tracking-wide uppercase"
            style={{ color: '#d4b16a' }}
          >
            Jornada da Campanha
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'rgba(212,177,106,0.15)',
              color: '#d4b16a',
              border: '1px solid rgba(212,177,106,0.3)',
            }}
          >
            Ato {currentAct}
          </span>
          <span
            className="text-xs transition-transform duration-200"
            style={{
              color: 'rgba(212,177,106,0.6)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Collapsed preview — show only current act */}
      {!expanded && (
        <div className="px-4 pb-4">
          {acts.filter(a => a.number === currentAct).map(act => (
            <div
              key={act.number}
              className="rounded-lg p-3"
              style={{
                background: 'rgba(212,177,106,0.08)',
                border: '1px solid rgba(212,177,106,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '0.85rem' }}>🔥</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#d4b16a' }}>
                  {act.title} — {act.subtitle}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {act.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expanded — full timeline */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {acts.map((act, index) => {
            const status = getActStatus(act.number, currentAct)
            const isLast = index === acts.length - 1

            return (
              <div key={act.number} className="flex gap-3">
                {/* Timeline column */}
                <div className="flex flex-col items-center" style={{ minWidth: '28px' }}>
                  {/* Icon */}
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                    style={{
                      width: '28px',
                      height: '28px',
                      ...(status === 'completed' ? {
                        background: 'rgba(74,222,128,0.15)',
                        border: '1px solid rgba(74,222,128,0.4)',
                        color: '#4ade80',
                      } : status === 'current' ? {
                        background: 'rgba(212,177,106,0.2)',
                        border: '1.5px solid #d4b16a',
                        color: '#d4b16a',
                        boxShadow: '0 0 8px rgba(212,177,106,0.3)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.25)',
                      }),
                    }}
                  >
                    {status === 'completed' ? '✓' : status === 'current' ? '⚔' : '🔒'}
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      style={{
                        width: '1px',
                        flexGrow: 1,
                        minHeight: '12px',
                        background: status === 'completed'
                          ? 'rgba(74,222,128,0.3)'
                          : status === 'current'
                          ? 'rgba(212,177,106,0.2)'
                          : 'rgba(255,255,255,0.07)',
                        margin: '3px 0',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className="flex-1 rounded-lg p-3 mb-1"
                  style={{
                    ...(status === 'current' ? {
                      background: 'rgba(212,177,106,0.08)',
                      border: '1px solid rgba(212,177,106,0.25)',
                    } : status === 'completed' ? {
                      background: 'rgba(74,222,128,0.05)',
                      border: '1px solid rgba(74,222,128,0.15)',
                    } : {
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }),
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: status === 'completed'
                          ? 'rgba(74,222,128,0.8)'
                          : status === 'current'
                          ? '#d4b16a'
                          : 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {act.title}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: status === 'completed'
                          ? 'rgba(74,222,128,0.6)'
                          : status === 'current'
                          ? 'rgba(212,177,106,0.7)'
                          : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      — {act.subtitle}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: status === 'locked'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {status === 'locked' ? '???' : act.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
