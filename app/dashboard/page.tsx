'use client'

import React, { useEffect, useState } from 'react'
import CampaignCard from '../../components/CampaignCard'
import FantasyBackground from '../../components/FantasyBackground'
import { campaigns as mockCampaigns } from '../../lib/mock'
import { getCampaigns } from '../../lib/storage'
import type { Campaign } from '../../lib/types'

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/campaigns')
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const campaignsFromApi: Campaign[] = await response.json()
        console.log('Campanhas carregadas do banco:', campaignsFromApi)
        setCampaigns(campaignsFromApi)
      } catch (fetchError) {
        console.error('Falha ao carregar campanhas da API:', fetchError)
        setError('Não foi possível conectar ao banco. Exibindo campanhas locais.')
        setCampaigns(getCampaigns())
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
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted mt-1">Campanhas do banco em primeiro lugar. Se a API falhar, será usado o fallback localStorage.</p>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-blood">{error}</div>}
      {isLoading ? (
        <div className="text-muted">Carregando campanhas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.length === 0 ? (
            mockCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)
          ) : (
            campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)
          )}
        </div>
      )}
      </div>
      </div>
    </FantasyBackground>
  )
}
