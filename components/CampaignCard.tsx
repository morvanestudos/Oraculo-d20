import Link from 'next/link'
import React from 'react'
import type { Campaign } from '../lib/types'

type Props = { campaign: Campaign }

export default function CampaignCard({ campaign }: Props) {
  return (
    <div className="adventure-card rounded-3xl overflow-hidden transition hover:-translate-y-1">
      <div className="adventure-card-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold title-cinematic">{campaign.title}</div>
            <div className="text-xs text-muted mt-1">Nível {campaign.level}</div>
          </div>
          <div className="adventure-badge">{campaign.theme}</div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted max-h-16 overflow-hidden">{campaign.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gold">{campaign.players.length}/{campaign.maxPlayers} jogadores</div>
          <Link href={`/campaigns/${campaign.id}`} className="inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-full text-sm font-semibold shadow-sm">Abrir mesa</Link>
        </div>
      </div>
    </div>
  )
}
