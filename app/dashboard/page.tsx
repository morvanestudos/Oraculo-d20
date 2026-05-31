'use client'

import React, { useEffect, useState } from 'react'
import CampaignCard from '../../components/CampaignCard'
import FantasyBackground from '../../components/FantasyBackground'
import type { Campaign } from '../../lib/types'
import { getRandomLoadingPhrase } from '../../lib/loadingPhrases'

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingPhrase] = useState(() => getRandomLoadingPhrase())

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/campaigns')
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        setCampaigns(await response.json())
      } catch {
        setError('Não foi possível carregar campanhas. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaigns()
  }, [])

  return (
    <FantasyBackground image="/images/bg-dashboard.jpg" overlayIntensity={0.72}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Salão das Aventuras</h1>
              <p className="text-muted mt-1">Escolha uma lenda para adentrar. O Mestre aguarda.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-blood">{error}</div>
          )}

          {isLoading ? (
            <div className="text-muted italic">{loadingPhrase}</div>
          ) : campaigns.length === 0 && !error ? (
            <div className="text-muted italic">Nenhuma lenda foi escrita ainda. Que tal criar a primeira?</div>
          ) : !error ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map(c => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </FantasyBackground>
  )
}
