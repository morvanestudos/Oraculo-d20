'use client'
import React, { useEffect, useState } from 'react'
import type { Campaign, Quest } from '../lib/types'

const TAVERNA_INTRO =
  'Uma chuva fina cobre os telhados tortos da vila de Valdrak. Na velha Taverna dos Corvos, ' +
  'viajantes cochicham sobre desaparecimentos durante a madrugada. Entre o som da chuva e o ' +
  'ranger da madeira, algo observa do lado de fora.'

export const TAVERNA_INITIAL_MESSAGE =
  'Uma chuva fina cobre os telhados tortos da pequena vila de Valdrak. ' +
  'O cheiro de madeira molhada e fumaça paira no ar enquanto você empurra a porta rangente da Taverna dos Corvos.\n\n' +
  'Dentro, o calor da lareira contrasta com o frio lá fora. Brós, o taverneiro — homem robusto de olhos cansados — limpa o balcão e ergue os olhos para você.\n\n' +
  '*"Mais um aventureiro... ou veio apenas beber?"* ele murmura, a voz baixa.\n\n' +
  'Rumores circulam: moradores desaparecem durante a madrugada. Cantos estranhos vêm da floresta ao norte. ' +
  'Alguns juram ter visto olhos vermelhos entre as árvores.\n\n' +
  '**O que você faz?**'

const TAVERNA_FALLBACK_OBJECTIVES = [
  'Investigar os desaparecimentos',
  'Conversar com o taverneiro',
  'Explorar a floresta ao norte',
  'Descobrir a origem dos cantos',
  'Encontrar o culto oculto',
]

type Props = {
  campaign: Campaign
  onStart: (initialMessage: string) => Promise<void>
  isStarting: boolean
}

export default function CampaignIntroPanel({ campaign, onStart, isStarting }: Props) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetch(`/api/campaigns/${campaign.id}/quests`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Quest[]) => setQuests(data.filter(q => q.status === 'active')))
      .catch(() => {})
  }, [campaign.id])

  const isTaverna = campaign.title.toLowerCase().includes('taverna dos corvos')
  const introText = isTaverna ? TAVERNA_INTRO : campaign.description

  const objectives =
    quests.length > 0
      ? quests.map(q => q.title)
      : (isTaverna ? TAVERNA_FALLBACK_OBJECTIVES : [])

  const initialMessage = isTaverna
    ? TAVERNA_INITIAL_MESSAGE
    : campaign.description
      ? `${campaign.description}\n\nO Mestre aguarda. Apresente seu personagem e declare sua primeira ação.`
      : 'As tochas tremulam enquanto a aventura começa. Apresentem seus personagens e declarem suas primeiras ações, viajantes.'

  return (
    <>
      <style>{`
        @keyframes intro-glow-pulse {
          0%   { box-shadow: 0 0 18px rgba(212,177,106,0.18), 0 6px 22px rgba(0,0,0,0.55); }
          50%  { box-shadow: 0 0 34px rgba(212,177,106,0.38), 0 6px 30px rgba(0,0,0,0.55), 0 0 60px rgba(212,177,106,0.12); }
          100% { box-shadow: 0 0 18px rgba(212,177,106,0.18), 0 6px 22px rgba(0,0,0,0.55); }
        }
        .intro-start-btn {
          padding: 0.82rem 3rem;
          background: linear-gradient(135deg, rgba(148,96,20,0.96), rgba(90,54,8,0.92) 50%, rgba(148,96,20,0.96));
          border: 1px solid rgba(212,177,106,0.55);
          border-radius: 5px;
          color: #f2e2a8;
          font-family: Cinzel, serif;
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          cursor: pointer;
          text-shadow: 0 0 12px rgba(242,226,168,0.35);
          transition: all 0.25s ease;
          animation: intro-glow-pulse 2.8s ease-in-out infinite;
        }
        .intro-start-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(172,112,24,0.98), rgba(108,66,10,0.96) 50%, rgba(172,112,24,0.98));
          border-color: rgba(212,177,106,0.75);
          color: #faefc0;
          transform: translateY(-2px);
        }
        .intro-start-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .intro-start-btn:disabled {
          opacity: 0.65;
          cursor: wait;
          animation: none;
        }
      `}</style>

      {/* Full-screen overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'linear-gradient(180deg, rgba(2,1,0,0.97) 0%, rgba(6,3,1,0.96) 100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.55s ease',
      }}>
        {/* Ambient light blobs */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: [
            'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(212,177,106,0.065) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 80% 75%, rgba(79,70,229,0.04) 0%, transparent 60%)',
          ].join(', '),
        }} />

        {/* Parchment panel */}
        <div style={{
          position: 'relative',
          maxWidth: 540,
          width: '100%',
          padding: '2.6rem 2.5rem 2.2rem',
          background: 'linear-gradient(175deg, rgba(22,13,5,0.99) 0%, rgba(11,6,2,0.99) 100%)',
          border: '1px solid rgba(212,177,106,0.28)',
          borderRadius: 8,
          boxShadow: [
            '0 0 90px rgba(0,0,0,0.85)',
            '0 0 45px rgba(212,177,106,0.055)',
            'inset 0 1px 0 rgba(212,177,106,0.11)',
            'inset 0 -1px 0 rgba(212,177,106,0.05)',
          ].join(', '),
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'transform 0.55s ease',
        }}>

          {/* Corner ornaments */}
          <div style={{ position:'absolute', top:10, left:10, width:20, height:20, borderTop:'1.5px solid rgba(212,177,106,0.38)', borderLeft:'1.5px solid rgba(212,177,106,0.38)', borderRadius:'2px 0 0 0' }} />
          <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderTop:'1.5px solid rgba(212,177,106,0.38)', borderRight:'1.5px solid rgba(212,177,106,0.38)', borderRadius:'0 2px 0 0' }} />
          <div style={{ position:'absolute', bottom:10, left:10, width:20, height:20, borderBottom:'1.5px solid rgba(212,177,106,0.38)', borderLeft:'1.5px solid rgba(212,177,106,0.38)', borderRadius:'0 0 0 2px' }} />
          <div style={{ position:'absolute', bottom:10, right:10, width:20, height:20, borderBottom:'1.5px solid rgba(212,177,106,0.38)', borderRight:'1.5px solid rgba(212,177,106,0.38)', borderRadius:'0 0 2px 0' }} />

          {/* Title */}
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.55rem',
            fontWeight: 700,
            color: '#e8d4a0',
            textAlign: 'center',
            letterSpacing: '0.07em',
            textShadow: '0 0 28px rgba(212,177,106,0.32)',
            margin: 0,
            lineHeight: 1.35,
          }}>
            {campaign.title}
          </h1>

          {/* Gold divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'1.3rem 0' }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.32), transparent)' }} />
            <span style={{ color:'rgba(212,177,106,0.55)', fontSize:'0.7rem' }}>✦</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,177,106,0.32), transparent)' }} />
          </div>

          {/* Intro text */}
          <p style={{
            color: '#c0a870',
            fontSize: '0.86rem',
            lineHeight: 1.8,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: '0 0 1.6rem',
          }}>
            {introText}
          </p>

          {/* Objectives block */}
          {objectives.length > 0 && (
            <div style={{
              background: 'rgba(212,177,106,0.03)',
              border: '1px solid rgba(212,177,106,0.11)',
              borderRadius: 4,
              padding: '1rem 1.25rem 0.85rem',
              marginBottom: '2rem',
            }}>
              <div style={{
                fontSize: '0.58rem',
                textTransform: 'uppercase',
                letterSpacing: '0.28em',
                color: 'rgba(212,177,106,0.6)',
                textAlign: 'center',
                marginBottom: '0.8rem',
              }}>
                Objetivos
              </div>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:5 }}>
                {objectives.map((obj, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.79rem',
                    color: '#9a8060',
                    fontFamily: 'Georgia, serif',
                    lineHeight: 1.45,
                  }}>
                    <span style={{ color:'rgba(212,177,106,0.45)', fontSize:'0.52rem', flexShrink:0 }}>◆</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA button */}
          <div style={{ display:'flex', justifyContent:'center' }}>
            <button
              className="intro-start-btn"
              onClick={() => !isStarting && onStart(initialMessage)}
              disabled={isStarting}
            >
              {isStarting ? 'Iniciando...' : 'Começar aventura'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
