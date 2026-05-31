'use client'
import React, { useEffect, useRef, useState } from 'react'
import type { CampaignMemory } from '../lib/types'

type Props = {
  campaignId: string
  campaignTitle?: string
}

type MapLocation = {
  id: string
  label: string
  icon: string
  desc: string
  cx: number  // % of SVG width
  cy: number  // % of SVG height
  discoveryHint: string  // keyword to look for in memory to mark as known
}

const LOCATIONS: MapLocation[] = [
  {
    id: 'taverna',
    label: 'Taverna dos Corvos',
    icon: '🍺',
    desc: 'O coração sujo e aquecido da vila. Ponto de encontro dos aventureiros.',
    cx: 40, cy: 62,
    discoveryHint: 'taverna',
  },
  {
    id: 'praca',
    label: 'Praça da Vila',
    icon: '🏘️',
    desc: 'Centro de Valdrak. Os moradores evitam o lugar à noite.',
    cx: 56, cy: 50,
    discoveryHint: 'praça',
  },
  {
    id: 'poco',
    label: 'Poço Abandonado',
    icon: '⚫',
    desc: 'Um poço antigo onde dois moradores desapareceram. Cheira a terra molhada e algo mais.',
    cx: 72, cy: 70,
    discoveryHint: 'poço',
  },
  {
    id: 'floresta',
    label: 'Floresta Norte',
    icon: '🌲',
    desc: 'De lá vêm os cantos. Ninguém retornou depois da meia-noite.',
    cx: 50, cy: 12,
    discoveryHint: 'floresta',
  },
  {
    id: 'capela',
    label: 'Capela Antiga',
    icon: '⛪',
    desc: 'Abandonada há décadas. Símbolos estranhos gravados nas paredes internas.',
    cx: 80, cy: 30,
    discoveryHint: 'capela',
  },
  {
    id: 'trilha',
    label: 'Trilha dos Corvos',
    icon: '🪶',
    desc: 'Caminho que corta o mato em direção à floresta. Penas negras no chão.',
    cx: 20, cy: 28,
    discoveryHint: 'trilha',
  },
]

// Paths between locations [from, to] by id
const PATHS: [string, string][] = [
  ['taverna',  'praca'],
  ['praca',    'poco'],
  ['praca',    'floresta'],
  ['praca',    'trilha'],
  ['floresta', 'trilha'],
  ['floresta', 'capela'],
  ['praca',    'capela'],
]

function detectCurrentLocation(memory: CampaignMemory | null): string {
  if (!memory) return 'taverna'
  const combined = ((memory.currentLocation ?? '') + ' ' + (memory.currentScene ?? '')).toLowerCase()
  const match = LOCATIONS.find(loc => combined.includes(loc.discoveryHint))
  return match?.id ?? 'taverna'
}

function detectKnownLocations(memory: CampaignMemory | null, currentId: string): Set<string> {
  const known = new Set<string>(['taverna', currentId])
  if (!memory) return known

  const combined = [
    memory.currentLocation ?? '',
    memory.currentScene ?? '',
    memory.lastPlayerAction ?? '',
    memory.lastMasterAction ?? '',
    ...(Array.isArray(memory.discoveredClues) ? memory.discoveredClues : []),
    memory.summary ?? '',
  ].join(' ').toLowerCase()

  LOCATIONS.forEach(loc => {
    if (combined.includes(loc.discoveryHint)) known.add(loc.id)
  })

  return known
}

export default function ValdrakMap({ campaignId, campaignTitle }: Props) {
  const [memory, setMemory] = useState<CampaignMemory | null>(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  async function fetchMemory() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/memory`)
      if (res.ok) setMemory(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchMemory()
    const interval = setInterval(fetchMemory, 45_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const isTaverna = (campaignTitle ?? '').toLowerCase().includes('taverna dos corvos')
  if (!isTaverna && !loading) return null   // Only show for this campaign for now

  const currentId = detectCurrentLocation(memory)
  const knownIds  = detectKnownLocations(memory, currentId)

  // Convert cx/cy (0-100) to SVG viewport coords (SVG is 280×180)
  const W = 280, H = 180
  const cx = (pct: number) => (pct / 100) * W
  const cy = (pct: number) => (pct / 100) * H

  const hoveredLoc = LOCATIONS.find(l => l.id === hovered)

  return (
    <>
      <style>{`
        @keyframes map-pulse {
          0%,100% { r: 6; opacity: 1; }
          50%      { r: 8; opacity: 0.8; }
        }
        .map-loc-current { animation: map-pulse 2s ease-in-out infinite; }
        .map-loc-dot { cursor: pointer; transition: r 0.15s; }
        .map-loc-dot:hover { r: 7; }
      `}</style>

      <div style={{
        background: 'linear-gradient(175deg, rgba(20,12,4,0.98), rgba(10,6,2,0.96))',
        border: '1px solid rgba(212,177,106,0.18)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,177,106,0.07)',
      }}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setCollapsed(o => !o)}
          style={{
            width: '100%', padding: '0.75rem 0.95rem 0.6rem',
            borderBottom: collapsed ? 'none' : '1px solid rgba(212,177,106,0.1)',
            background: 'rgba(22,13,4,0.98)',
            display: 'flex', alignItems: 'center', gap: 7,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '0.82rem' }}>🗺️</span>
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: '0.68rem', fontWeight: 700,
            color: '#c4a870', textTransform: 'uppercase', letterSpacing: '0.2em',
          }}>
            Vila de Valdrak
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(212,177,106,0.35)' }}>
            {collapsed ? '▸' : '▾'}
          </span>
        </button>

        {!collapsed && (
          <div style={{ padding: '0.75rem 0.8rem 0.8rem' }}>
            {loading ? (
              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#5a4820', fontStyle: 'italic' }}>
                  Carregando mapa...
                </span>
              </div>
            ) : (
              <>
                {/* SVG Map */}
                <div style={{
                  position: 'relative',
                  background: 'linear-gradient(160deg, rgba(28,17,5,0.98), rgba(18,10,3,0.96))',
                  border: '1px solid rgba(212,177,106,0.14)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  marginBottom: '0.6rem',
                }}>
                  {/* Parchment grain overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(ellipse at 30% 25%, rgba(212,177,106,0.04) 0%, transparent 55%)',
                  }} />

                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  >
                    {/* Paths */}
                    {PATHS.map(([aId, bId]) => {
                      const a = LOCATIONS.find(l => l.id === aId)!
                      const b = LOCATIONS.find(l => l.id === bId)!
                      const aKnown = knownIds.has(aId)
                      const bKnown = knownIds.has(bId)
                      const visible = aKnown || bKnown
                      return (
                        <line
                          key={`${aId}-${bId}`}
                          x1={cx(a.cx)} y1={cy(a.cy)}
                          x2={cx(b.cx)} y2={cy(b.cy)}
                          stroke={visible ? 'rgba(212,177,106,0.2)' : 'rgba(255,255,255,0.05)'}
                          strokeWidth={0.8}
                          strokeDasharray="3 4"
                        />
                      )
                    })}

                    {/* Location markers */}
                    {LOCATIONS.map(loc => {
                      const known   = knownIds.has(loc.id)
                      const current = loc.id === currentId
                      const isHov   = hovered === loc.id

                      return (
                        <g
                          key={loc.id}
                        
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Outer glow for current */}
                          {current && (
                            <circle
                              cx={cx(loc.cx)} cy={cy(loc.cy)} r={10}
                              fill="rgba(212,177,106,0.08)"
                              stroke="rgba(212,177,106,0.2)"
                              strokeWidth={0.8}
                            />
                          )}

                          {/* Main dot */}
                          <circle
                            className={current ? 'map-loc-current map-loc-dot' : 'map-loc-dot'}
                            cx={cx(loc.cx)} cy={cy(loc.cy)}
                            r={current ? 6 : (isHov ? 5.5 : 4.5)}
                            fill={current
                              ? 'rgba(212,177,106,0.85)'
                              : known
                                ? 'rgba(90,60,20,0.7)'
                                : 'rgba(40,30,15,0.6)'}
                            stroke={current
                              ? 'rgba(212,177,106,0.9)'
                              : known
                                ? 'rgba(212,177,106,0.3)'
                                : 'rgba(212,177,106,0.1)'}
                            strokeWidth={1}
                          />

                          {/* Label */}
                          <text
                            x={cx(loc.cx)}
                            y={cy(loc.cy) + (loc.cy > 50 ? -9 : 14)}
                            textAnchor="middle"
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontSize: 8,
                              fill: current
                                ? '#e0c870'
                                : known
                                  ? 'rgba(180,140,60,0.75)'
                                  : 'rgba(100,75,30,0.5)',
                              fontStyle: 'italic',
                            }}
                          >
                            {known ? loc.label : '???'}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                {/* Tooltip / info box */}
                <div style={{
                  minHeight: 44,
                  padding: '6px 9px',
                  background: 'rgba(212,177,106,0.03)',
                  border: '1px solid rgba(212,177,106,0.1)',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                }}>
                  {hoveredLoc && knownIds.has(hoveredLoc.id) ? (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3,
                      }}>
                        <span style={{ fontSize: '0.8rem' }}>{hoveredLoc.icon}</span>
                        <span style={{
                          fontFamily: 'Cinzel, serif', fontSize: '0.73rem', fontWeight: 600,
                          color: hoveredLoc.id === currentId ? '#e0c870' : '#b89848',
                        }}>
                          {hoveredLoc.label}
                        </span>
                        {hoveredLoc.id === currentId && (
                          <span style={{
                            fontSize: '0.55rem', color: '#4ade80',
                            background: 'rgba(74,222,128,0.08)',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: 3, padding: '1px 5px',
                            fontFamily: 'Cinzel, serif', letterSpacing: '0.1em',
                          }}>
                            você está aqui
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.68rem', color: '#7a6040',
                        fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.4,
                      }}>
                        {hoveredLoc.desc}
                      </div>
                    </>
                  ) : hoveredLoc ? (
                    <div style={{ fontSize: '0.7rem', color: '#4a3818', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      Local desconhecido. Explore para revelar.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: '#3a2810', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      Passe o mouse sobre um local para ver detalhes.
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex', gap: 12, marginTop: '0.5rem',
                  fontSize: '0.57rem', color: 'rgba(100,75,30,0.6)',
                  fontFamily: 'Georgia, serif',
                }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(212,177,106,0.85)', display:'inline-block' }} />
                    Local atual
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(90,60,20,0.7)', display:'inline-block', border:'1px solid rgba(212,177,106,0.3)' }} />
                    Conhecido
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(40,30,15,0.6)', display:'inline-block' }} />
                    Desconhecido
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
