"use client"
import Link from 'next/link'
import React from 'react'
import type { Campaign } from '../lib/types'

type Props = { campaign: Campaign }

export default function CampaignCard({ campaign }: Props) {
  const playerCount = campaign.players?.length ?? 0
  const maxPlayers = campaign.maxPlayers ?? 6

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(175deg, rgba(22,13,5,0.98), rgba(11,6,2,0.96))',
      border: '1px solid rgba(212,177,106,0.2)',
      borderRadius: 6,
      overflow: 'hidden',
      transition: 'border-color 0.25s, box-shadow 0.25s',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    }}
    >
      {/* Top accent line */}
      <div style={{        height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.45), transparent)',
      }} />

      {/* Corner ornaments */}
      <div style={{ position:'absolute', top:8, left:8, width:10, height:10, borderTop:'1px solid rgba(212,177,106,0.3)', borderLeft:'1px solid rgba(212,177,106,0.3)' }} />
      <div style={{ position:'absolute', top:8, right:8, width:10, height:10, borderTop:'1px solid rgba(212,177,106,0.3)', borderRight:'1px solid rgba(212,177,106,0.3)' }} />
      <div style={{ position:'absolute', bottom:8, left:8, width:10, height:10, borderBottom:'1px solid rgba(212,177,106,0.3)', borderLeft:'1px solid rgba(212,177,106,0.3)' }} />
      <div style={{ position:'absolute', bottom:8, right:8, width:10, height:10, borderBottom:'1px solid rgba(212,177,106,0.3)', borderRight:'1px solid rgba(212,177,106,0.3)' }} />

      <div style={{ padding: '1rem 1.1rem 1rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: '0.6rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#e0c880',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
              textShadow: '0 0 12px rgba(212,177,106,0.15)',
            }}>
              {campaign.title}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#6a5030', marginTop: 2, letterSpacing: '0.08em' }}>
              Nível {campaign.level ?? 1}
            </div>
          </div>
          <div style={{
            flexShrink: 0,
            padding: '2px 8px',
            background: 'rgba(212,177,106,0.07)',
            border: '1px solid rgba(212,177,106,0.18)',
            borderRadius: 3,
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(212,177,106,0.65)',
            fontFamily: 'Cinzel, serif',
            whiteSpace: 'nowrap',
          }}>
            {campaign.theme ?? 'Fantasia'}
          </div>
        </div>

        {/* Description */}
        {campaign.description && (
          <p style={{
            fontSize: '0.75rem',
            color: '#6a5838',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            lineHeight: 1.55,
            margin: '0 0 0.9rem',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>
            {campaign.description}
          </p>
        )}

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.65rem', color: '#4a3820' }}>👥</span>
            <span style={{ fontSize: '0.68rem', color: '#5a4828', letterSpacing: '0.06em' }}>
              {playerCount}/{maxPlayers}
            </span>
          </div>
          <Link
            href={`/campaigns/${campaign.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '0.38rem 0.9rem',
              background: 'linear-gradient(135deg, rgba(148,96,20,0.88), rgba(90,54,8,0.84))',
              border: '1px solid rgba(212,177,106,0.38)',
              borderRadius: 4,
              color: '#f0dc98',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Abrir mesa →
          </Link>
        </div>
      </div>
    </div>
  )
}
