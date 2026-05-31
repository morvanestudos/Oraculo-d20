'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveCampaign } from '../../lib/storage'
import FantasyBackground from '../../components/FantasyBackground'
import type { CampaignCreateDTO } from '../../lib/types'

export default function CreateCampaign() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [level, setLevel] = useState(1)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim() || !theme.trim() || !description.trim()) {
      setStatus('error')
      setMessage('Preencha todos os campos obrigatórios.')
      return
    }

    const campaignPayload: CampaignCreateDTO = {
      title,
      description,
      theme,
      level,
      maxPlayers
    }

    const campaignId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `campanha-${Date.now()}`

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload)
      })

      if (!response.ok) {
        throw new Error(`API retornou ${response.status}`)
      }

      const created = await response.json()
      console.log('Campanha criada no banco:', created)
      setStatus('success')
      setMessage('Uma nova lenda acaba de nascer. Convocando aventureiros...')
      window.setTimeout(() => router.push('/dashboard'), 600)
    } catch (error) {
      console.error('Erro ao criar campanha no banco, usando fallback localStorage:', error)
      saveCampaign({
        id: campaignId,
        title,
        theme,
        level,
        maxPlayers,
        description
      })
      setStatus('warning')
      setMessage('Os pergaminhos foram guardados localmente. A lenda prossegue...')
      window.setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  return (
    <FantasyBackground image="/images/bg-create-campaign.jpg" overlayIntensity={0.68}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
      <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Criar Nova Lenda</h1>
      <form onSubmit={handleSubmit} className="space-y-5 panel glass rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nome da campanha</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Ex: A Queda das Estrelas" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tema da aventura</label>
          <input value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Exploração / Horror / Política" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nível inicial</label>
            <input value={level} onChange={e => setLevel(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Máx. de jogadores</label>
            <input value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição do mundo</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg h-36" placeholder="Descreva o mundo da sua campanha" />
        </div>
        {message && (
          <div className={`text-sm ${status === 'error' ? 'text-blood' : 'text-arcane'}`}>
            {message}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" className="px-6 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-lg font-semibold shadow">Invocar a Aventura</button>
        </div>
      </form>
    </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
