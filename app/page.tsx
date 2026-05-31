import Link from 'next/link'
import React from 'react'
import CampaignCard from '../components/CampaignCard'
import FantasyBackground from '../components/FantasyBackground'
import prisma from '../lib/prisma'
import type { Campaign } from '../lib/types'

export const dynamic = 'force-dynamic'

const features = [
  {
    icon: '🧠',
    title: 'Mestre IA Persistente',
    desc: 'A IA lembra cada escolha, NPC e pista da sua campanha. A história evolui com você.',
  },
  {
    icon: '⚔️',
    title: 'Combate & Quests',
    desc: 'Rolagem de dados, iniciativa, missões dinâmicas criadas em tempo real pelo Mestre.',
  },
  {
    icon: '🌐',
    title: 'Multiplayer Realtime',
    desc: 'Até 6 aventureiros na mesma mesa, com prólogos personalizados e sala de espera.',
  },
]

const steps = [
  { num: '01', title: 'Crie seu personagem', desc: 'Defina raça, classe, atributos e história.' },
  { num: '02', title: 'Entre na mesa', desc: 'Use o código da campanha e aguarde na sala de espera.' },
  { num: '03', title: 'Comece a aventura', desc: 'O Mestre IA narra. Você decide. A lenda começa.' },
]

export default async function Home() {
  let featured: Campaign[] = []

  try {
    const rows = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
    featured = rows.map(c => ({
      id: c.id.toString(),
      title: c.title ?? '',
      description: c.description ?? '',
      theme: c.theme ?? 'Fantasia',
      level: c.level ?? 1,
      maxPlayers: c.maxPlayers ?? 4,
      players: [],
    }))
  } catch {
    // silently ignore
  }

  const primaryCampaign = featured[0] ?? null

  return (
    <FantasyBackground image="/images/bg-home.jpg" overlayIntensity={0.68}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-14">
          <div className="space-y-16">

            {/* ── Hero ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-7">

                {/* Eyebrow badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '4px 14px',
                  background: 'rgba(212,177,106,0.07)',
                  border: '1px solid rgba(212,177,106,0.2)',
                  borderRadius: 20,
                  fontSize: '0.65rem', textTransform: 'uppercase',
                  letterSpacing: '0.22em', color: 'rgba(212,177,106,0.7)',
                  fontFamily: 'Cinzel, serif',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                  Playtest aberto
                </div>

                {/* Main heading */}
                <h1 style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: '#f0e8d0',
                  letterSpacing: '-0.01em',
                  textShadow: '0 2px 30px rgba(212,177,106,0.15)',
                  margin: 0,
                }}>
                  Viva aventuras de RPG com um Mestre IA que lembra suas escolhas.
                </h1>

                <p style={{
                  color: '#9a8a6a',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  maxWidth: 460,
                  margin: 0,
                }}>
                  Cada decisão molda a narrativa. Cada missão tem consequências. Cada aventureiro deixa sua marca no mundo.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  {primaryCampaign ? (
                    <Link
                      href={`/campaigns/${primaryCampaign.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '0.8rem 1.8rem',
                        background: 'linear-gradient(135deg, rgba(148,96,20,0.95), rgba(90,54,8,0.90) 50%, rgba(148,96,20,0.95))',
                        border: '1px solid rgba(212,177,106,0.5)',
                        borderRadius: 6,
                        color: '#f2e2a8',
                        fontFamily: 'Cinzel, serif',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textDecoration: 'none',
                        boxShadow: '0 0 22px rgba(212,177,106,0.15), 0 4px 16px rgba(0,0,0,0.4)',
                        textShadow: '0 0 10px rgba(242,226,168,0.3)',
                        transition: 'all 0.25s',
                      }}
                    >
                      🍺 Entrar na Taverna dos Corvos
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="hero-cta">Ver campanhas</Link>
                  )}
                  <Link
                    href="/create-character"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '0.8rem 1.6rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      color: '#c8b890',
                      fontFamily: 'Cinzel, serif',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      textDecoration: 'none',
                      transition: 'all 0.25s',
                    }}
                  >
                    ⚔ Criar personagem
                  </Link>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'flex', gap: 24,
                  borderTop: '1px solid rgba(212,177,106,0.1)',
                  paddingTop: '1rem',
                }}>
                  {[
                    { label: 'Aventureiros', val: '∞' },
                    { label: 'Sessões épicas', val: '100%' },
                    { label: 'Mestre sempre pronto', val: '24/7' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontFamily:'Cinzel, serif', fontSize:'1.1rem', fontWeight:700, color:'#d4b16a' }}>{s.val}</div>
                      <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.15em', color:'rgba(156,163,175,0.6)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column — campaigns */}
              <div className="space-y-4">
                <div style={{
                  background: 'linear-gradient(175deg, rgba(20,12,5,0.96), rgba(10,6,2,0.94))',
                  border: '1px solid rgba(212,177,106,0.18)',
                  borderRadius: 10,
                  padding: '1.25rem',
                  boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,177,106,0.08)',
                }}>
                  <div style={{
                    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.25em',
                    color: 'rgba(212,177,106,0.5)', marginBottom: '0.9rem',
                    fontFamily: 'Cinzel, serif',
                  }}>
                    ✦ Campanhas em destaque
                  </div>
                  {featured.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {featured.map(c => (
                        <CampaignCard key={c.id} campaign={c} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem 1rem', textAlign: 'center',
                      color: '#6a5838', fontSize: '0.82rem',
                      fontFamily: 'Georgia, serif', fontStyle: 'italic',
                    }}>
                      Nenhuma campanha disponível ainda.{' '}
                      <Link href="/create-campaign" style={{ color: '#d4b16a', textDecoration: 'underline' }}>
                        Criar uma.
                      </Link>
                    </div>
                  )}
                </div>

                {/* IA info card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.06))',
                  border: '1px solid rgba(79,70,229,0.2)',
                  borderRadius: 8,
                  padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{ fontSize: '1.8rem', flexShrink: 0 }}>🧙</div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c4b0e0', fontFamily: 'Cinzel, serif' }}>
                      Mestre IA disponível
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7a6a9a', marginTop: 2 }}>
                      Narra com memória persistente e quests dinâmicas.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Feature cards ── */}
            <section>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem',
              }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.25), transparent)' }} />
                <span style={{ fontFamily:'Cinzel, serif', fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.28em', color:'rgba(212,177,106,0.45)' }}>
                  Por que Oraculo d20
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.25), transparent)' }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {features.map(f => (
                  <div key={f.title} style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(175deg, rgba(18,11,4,0.96), rgba(9,5,2,0.94))',
                    border: '1px solid rgba(212,177,106,0.14)',
                    borderRadius: 8,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'border-color 0.3s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.22), transparent)',
                    }} />
                    <div style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                    <div style={{
                      fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 600,
                      color: '#d4b16a', marginBottom: '0.5rem', letterSpacing: '0.04em',
                    }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#7a6848', lineHeight: 1.65, fontFamily: 'Georgia, serif' }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Como funciona ── */}
            <section>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem',
              }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.25), transparent)' }} />
                <span style={{ fontFamily:'Cinzel, serif', fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.28em', color:'rgba(212,177,106,0.45)' }}>
                  Como funciona
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,177,106,0.25), transparent)' }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((s, i) => (
                  <div key={s.num} style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '1.25rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                  }}>
                    <div style={{
                      fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 700,
                      color: 'rgba(212,177,106,0.2)', lineHeight: 1, flexShrink: 0,
                      minWidth: 40,
                    }}>
                      {s.num}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', fontWeight: 600, color: '#c8b080', marginBottom: 4 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#6a5838', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
