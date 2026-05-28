import Link from 'next/link'
import React from 'react'
import { campaigns } from '../lib/mock'
import CampaignCard from '../components/CampaignCard'
import FantasyBackground from '../components/FantasyBackground'

export default function Home() {
  return (
    <FantasyBackground image="/images/bg-home.jpg" overlayIntensity={0.64}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
      <div className="space-y-10">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="hero-scroll space-y-6">
          <h1>RPG de mesa com Mestre IA para aventuras sombrias</h1>
          <p className="max-w-xl">Entre na taverna digital do Oraculo d20 e conduza sua campanha através de masmorras, ruínas e verbos narrativos. Crie personagens, grave histórias e role o dado com estilo.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/create-campaign" className="hero-cta">Criar campanha</Link>
            <Link href="/dashboard" className="action-secondary">Entrar em uma mesa</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted">
            <div>• <strong>2.3k</strong> campanhas</div>
            <div>• <strong>8k</strong> aventureiros</div>
            <div>• <strong>99%</strong> sessões épicas</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel glass h-80 p-6 overflow-hidden">
            <h3 className="font-semibold mb-3">Campanhas em destaque</h3>
            <div className="grid grid-cols-1 gap-3">
              {campaigns.slice(0,3).map(c => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
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
        <p className="text-muted">Interface inspirada em pergaminhos, chat de mesa e ferramentas de campanha, mantendo tudo intuitivo e responsivo.</p>
      </section>
    </div>
      </div>
      </div>
    </FantasyBackground>
  )
}
