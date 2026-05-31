'use client'
import React, { useEffect, useState } from 'react'
import type { CampaignMemory } from '../lib/types'

type Props = {
  campaignId: string
  campaignTitle?: string
}

// Tension level → human-readable label + color
const TENSION_LABEL = ['', 'Calma', 'Calma', 'Moderada', 'Moderada', 'Tensa', 'Tensa', 'Alta', 'Alta', 'Crítica', 'Crítica']
const TENSION_COLOR = ['', '#4ade80', '#4ade80', '#d4b16a', '#d4b16a', '#f59e0b', '#f59e0b', '#f97316', '#f97316', '#ef4444', '#ef4444']

const TAVERNA_DEFAULTS = {
  location:  'Taverna dos Corvos',
  region:    'Vila de Valdrak',
  climate:   'Chuva fria da noite',
  threat:    'Desaparecimentos noturnos',
  objective: 'Investigar os desaparecimentos',
  tension:   3,
}

const GENERIC_DEFAULTS = {
  location:  'Desconhecido',
  region:    'Terras Desconhecidas',
  climate:   'Variável',
  threat:    'Nenhuma registrada',
  objective: 'Explorar e descobrir',
  tension:   1,
}

function deriveRegion(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('valdrak') || l.includes('taverna') || l.includes('corvos')) return 'Vila de Valdrak'
  if (l.includes('floresta') || l.includes('norte')) return 'Floresta ao Norte'
  return 'Terras Desconhecidas'
}

function deriveClimate(location: string, scene: string, isTaverna: boolean): string {
  if (isTaverna) return 'Chuva fria da noite'
  const s = (location + ' ' + scene).toLowerCase()
  if (s.includes('floresta') || s.includes('norte')) return 'Neblina densa'
  if (s.includes('caverna') || s.includes('dungeon')) return 'Úmido e escuro'
  if (s.includes('taverna') || s.includes('interior')) return 'Abafado, cheiro de fumaça'
  return 'Variável'
}

export default function WorldStatusPanel({ campaignId, campaignTitle }: Props) {
  const [memory, setMemory] = useState<CampaignMemory | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchMemory() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/memory`)
      if (res.ok) {
        const data = await res.json()
        setMemory(data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchMemory()
    const interval = setInterval(fetchMemory, 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const isTaverna = (campaignTitle ?? '').toLowerCase().includes('taverna dos corvos')
  const D = isTaverna ? TAVERNA_DEFAULTS : GENERIC_DEFAULTS

  const location  = memory?.currentLocation?.trim() || D.location
  const region    = memory?.currentLocation ? deriveRegion(memory.currentLocation) : D.region
  const climate   = deriveClimate(memory?.currentLocation ?? '', memory?.currentScene ?? '', isTaverna)
  const threat    = memory?.currentThreat?.trim()    || D.threat
  const objective = memory?.currentObjective?.trim() || D.objective
  const tension   = Math.min(Math.max(memory?.tensionLevel ?? D.tension, 1), 10)

  const tLabel = TENSION_LABEL[tension] ?? 'Moderada'
  const tColor = TENSION_COLOR[tension] ?? '#d4b16a'
  const tPct   = (tension / 10) * 100

  const infoRows = [
    { icon: '🏠', label: 'Local',    value: location },
    { icon: '🗺️',  label: 'Região',  value: region },
    { icon: '🌧️', label: 'Clima',   value: climate },
    { icon: '⚠️',  label: 'Ameaça',  value: threat },
    { icon: '🎯',  label: 'Objetivo', value: objective },
  ]

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(175deg, rgba(20,12,4,0.98), rgba(10,6,2,0.96))',
      border: '1px solid rgba(212,177,106,0.18)',
      borderRadius: 8,
      padding: '1rem 1.1rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.45), 0 0 16px rgba(212,177,106,0.04), inset 0 1px 0 rgba(212,177,106,0.08)',
    }}>
      {/* Top golden accent */}
      <div style={{
        height: 1.5,
        background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.38), transparent)',
        marginBottom: '0.85rem',
      }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:'0.85rem' }}>
        <span style={{ fontSize:'0.82rem', lineHeight:1 }}>🌍</span>
        <span style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#c4a870',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
        }}>
          Estado do Mundo
        </span>
        {loading && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.55rem',
            color: 'rgba(212,177,106,0.25)',
            fontStyle: 'italic',
          }}>
            atualizando...
          </span>
        )}
      </div>

      {/* Info rows */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {infoRows.map(r => (
          <div key={r.label} style={{ display:'flex', alignItems:'baseline', gap:7 }}>
            <span style={{ fontSize:'0.7rem', flexShrink:0, opacity:0.65 }}>{r.icon}</span>
            <span style={{
              fontSize: '0.57rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'rgba(212,177,106,0.38)',
              flexShrink: 0,
              minWidth: 46,
            }}>
              {r.label}
            </span>
            <span style={{
              fontSize: '0.76rem',
              color: '#9a8060',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.35,
            }}>
              {r.value}
            </span>
          </div>
        ))}

        {/* Tension row */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
            <span style={{ fontSize:'0.7rem', opacity:0.65 }}>⚡</span>
            <span style={{
              fontSize: '0.57rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'rgba(212,177,106,0.38)',
              minWidth: 46,
            }}>
              Tensão
            </span>
            <span style={{
              fontSize: '0.72rem',
              color: tColor,
              fontFamily: 'Cinzel, serif',
              fontWeight: 600,
              letterSpacing: '0.06em',
              marginLeft: 'auto',
              textShadow: `0 0 8px ${tColor}55`,
            }}>
              {tLabel}
            </span>
          </div>
          {/* Bar */}
          <div style={{
            height: 4,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            overflow: 'hidden',
            marginLeft: 22,
          }}>
            <div style={{
              height: '100%',
              borderRadius: 2,
              width: `${tPct}%`,
              background: `linear-gradient(90deg, rgba(74,222,128,0.55), ${tColor})`,
              boxShadow: `0 0 6px ${tColor}55`,
              transition: 'width 0.8s ease, background 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.14), transparent)',
        marginTop: '0.85rem',
      }} />
    </div>
  )
}
