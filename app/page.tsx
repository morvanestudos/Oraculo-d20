import Link from 'next/link'
import React from 'react'
import CampaignCard from '../components/CampaignCard'
import FantasyBackground from '../components/FantasyBackground'
import prisma from '../lib/prisma'
import type { Campaign } from '../lib/types'

export const dynamic = 'force-dynamic'

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
    // silently ignore — section will be hidden
  }

  const primaryCampaign = featured[0] ?? null

  return (
    <FantasyBackground image="/images/bg-home.jpg" overlayIntensity={0.64}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
          <div className="space-y-10">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="hero-scroll space-y-6">
                <h1>RPG de mesa com Mestre IA para aventuras sombrias</h1>
                <p className="max-w-xl">
                  Entre na taverna digital do Oraculo d20 e conduza sua campanha através de masmorras,
                  ruínas e verbos narrativos. Crie personagens, grave histórias e role o dado com estilo.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link href="/create-campaign" className="hero-cta">Criar campanha</Link>
                  {primaryCampaign ? (
                    <Link href={`/campaigns/${primaryCampaign.id}`} className="action-secondary">
                      Entrar em {primaryCampaign.title}
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="action-secondary">Entrar em uma mesa</Link>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="panel glass p-6 rounded-lg overflow-hidden">
                  <h3 className="font-semibold mb-3">Campanhas em destaque</h3>
                  {featured.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {featured.map(c => (
                        <CampaignCard key={c.id} campaign={c} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted py-4">
                      Nenhuma campanha disponível.{' '}
                      <Link href="/dashboard" className="text-gold underline underline-offset-2">
                        Acesse o Dashboard
                      </Link>{' '}
                      para começar.
                    </div>
                  )}
                </div>
                <div className="panel glass p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">Crie aventuras infinitas</div>
                    <div className="font-semibold">Mestres IA prontos para narrar</div>
                  </div>
                  <div className="text-3xl text-arcane">🔥</div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Como funciona</h2>
              <p className="text-muted">
                Interface inspirada em pergaminhos, chat de mesa e ferramentas de campanha,
                mantendo tudo intuitivo e responsivo.
              </p>
            </section>
          </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
