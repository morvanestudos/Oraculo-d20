'use client'

import React, { useEffect, useState } from 'react'
import { getActiveCharacter, getCampaignById, getCharacters, setActiveCharacter as persistActiveCharacter, saveCharacter } from '../../../lib/storage'
import { fetchCharacters, updateCharacter } from '../../../lib/api/characters'
import DiceRoller from '../../../components/DiceRoller'
import ChatBox from '../../../components/ChatBox'
import CharacterSheet from '../../../components/CharacterSheet'
import FantasyBackground from '../../../components/FantasyBackground'
import QuestLog from '../../../components/QuestLog'
import type { Campaign, Character } from '../../../lib/types'

export default function CampaignRoom({ params }: { params: { id: string } }) {
  const id = params.id
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [campaignCharacters, setCampaignCharacters] = useState<Character[]>([])
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([])
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  function handleSelectCharacter(character: Character) {
    persistActiveCharacter(character)
    setActiveCharacter(character)
  }

  function mergeCharacters(remote: Character[], local: Character[]) {
    const merged = new Map<string, Character>()
    local.forEach(character => merged.set(character.id, character))
    remote.forEach(character => merged.set(character.id, character))
    return Array.from(merged.values())
  }

  async function handleUseCharacter(character: Character) {
    setJoinError(null)
    setIsJoining(true)

    const targetCampaignId = id
    const patchedCharacter = { ...character, campaignId: targetCampaignId }

    try {
      const updated = await updateCharacter(character.id, { campaignId: targetCampaignId })
      persistActiveCharacter(updated)
      if (updated.campaignId === targetCampaignId) {
        setCampaignCharacters(prev => {
          const exists = prev.some(item => item.id === updated.id)
          return exists ? prev.map(item => (item.id === updated.id ? updated : item)) : [updated, ...prev]
        })
      }
      setAvailableCharacters(prev => {
        const exists = prev.some(item => item.id === updated.id)
        return exists ? prev.map(item => (item.id === updated.id ? updated : item)) : [updated, ...prev]
      })
      setActiveCharacter(updated)
    } catch (error) {
      console.error('Falha ao vincular personagem à campanha:', error)
      saveCharacter(patchedCharacter)
      persistActiveCharacter(patchedCharacter)
      setActiveCharacter(patchedCharacter)
      setCampaignCharacters(prev => {
        const exists = prev.some(item => item.id === patchedCharacter.id)
        return exists ? prev.map(item => (item.id === patchedCharacter.id ? patchedCharacter : item)) : [patchedCharacter, ...prev]
      })
      setAvailableCharacters(prev => prev.map(item => (item.id === patchedCharacter.id ? patchedCharacter : item)))
      setJoinError('Não foi possível atualizar o personagem no servidor. A campanha foi atualizada localmente.')
    } finally {
      setIsJoining(false)
    }
  }

  useEffect(() => {
    const localActiveCharacter = getActiveCharacter()
    setActiveCharacter(localActiveCharacter)

    async function loadCampaign() {
      setIsLoading(true)
      try {
        const [campaignResponse, campaignCharactersFromApi, allCharactersFromApi] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetchCharacters(id),
          fetchCharacters()
        ])

        if (!campaignResponse.ok) {
          throw new Error(`API retornou ${campaignResponse.status}`)
        }

        const campaignFromApi: Campaign = await campaignResponse.json()
        setCampaign(campaignFromApi)
        setCampaignCharacters(campaignCharactersFromApi)

        const localCharacters = getCharacters()
        setAvailableCharacters(mergeCharacters(allCharactersFromApi, localCharacters))

        if (!localActiveCharacter && campaignCharactersFromApi.length > 0) {
          setActiveCharacter(campaignCharactersFromApi[0])
        }
      } catch (fetchError) {
        console.error('Falha ao carregar campanha ou personagens da API:', fetchError)
        setError('Não foi possível carregar dados do banco. Usando fallback localStorage.')
        setCampaign(getCampaignById(id))
        const localCharacters = getCharacters()
        setCampaignCharacters(localCharacters.filter(char => char.campaignId === id))
        setAvailableCharacters(localCharacters)
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaign()
  }, [id])

  if (isLoading) {
    return <div className="text-muted">Carregando campanha...</div>
  }

  if (!campaign) {
    return <div className="text-muted">Campanha não encontrada.</div>
  }

  return (
    <FantasyBackground image="/images/bg-campaign-room.jpg" overlayIntensity={0.66}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {error && <div className="text-sm text-blood">{error}</div>}
      <div className="lg:col-span-3 space-y-4">
        <div className="panel glass p-6 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold title-cinematic">{campaign.title}</h2>
              <p className="text-sm text-muted mt-2">{campaign.description}</p>
            </div>
            <div className="text-sm text-muted">Nível {campaign.level}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 panel glass p-4 rounded-lg">
            <div className="mb-4">
              <h3 className="font-semibold">Chat da Mesa</h3>
              <p className="text-xs text-muted">Converse com jogadores e com o Mestre IA</p>
            </div>
            {campaign && <ChatBox campaignId={campaign.id} campaign={campaign} character={activeCharacter} />}
          </div>

          <div className="panel glass p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">Mestre IA</h4>
                <div className="text-xs text-muted">Painel de controle</div>
              </div>
              {campaign && <DiceRoller campaignId={campaign.id} />}
            </div>
            <div className="text-sm text-muted">Logs de cena e sugestões do Mestre IA aparecerão aqui.</div>
          </div>
        </div>

        <div className="panel glass p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Logs de Combate</h3>
          <div className="bg-[#07070a] p-3 rounded h-32 overflow-y-auto text-sm text-muted">Sem eventos recentes.</div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel glass p-4 rounded-lg">
          <QuestLog campaignId={campaign.id} />
        </div>

        <div className="panel glass p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Jogadores</h3>
          <ul className="space-y-3 text-sm text-muted">
            {campaign.players.map(p => (
              <li key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs">{p.characterName}</div>
                </div>
                <div className="text-xs text-muted">Lv {p.level}</div>
              </li>
            ))}
          </ul>
        </div>

        {activeCharacter && activeCharacter.campaignId !== id && (
          <div className="panel glass p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Entrar nesta campanha</h3>
            <div className="text-sm text-muted mb-4">
              O personagem ativo atual não está vinculado a esta campanha. Use-o para entrar diretamente na cena inicial.
            </div>
            <button
              type="button"
              disabled={isJoining}
              onClick={() => handleUseCharacter(activeCharacter)}
              className="w-full text-xs uppercase tracking-[0.2em] px-4 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-lg font-semibold"
            >
              {isJoining ? 'Entrando...' : 'Entrar nesta campanha com este personagem'}
            </button>
            {joinError && <div className="text-sm text-blood mt-3">{joinError}</div>}
          </div>
        )}

        <div className="panel glass p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Meus personagens</h3>
          {availableCharacters.length > 0 ? (
            <ul className="space-y-3 text-sm text-muted">
              {availableCharacters.map(character => {
                const isActive = activeCharacter?.id === character.id
                const isInCampaign = character.campaignId === id
                return (
                  <li key={character.id} className="border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{character.name}</div>
                        <div className="text-xs">{character.race} • {character.className}</div>
                        <div className="text-xs text-muted">{character.campaignId ? `Campanha ${character.campaignId}` : 'Sem campanha'}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {isActive ? (
                          <span className="text-[10px] uppercase tracking-[0.2em] text-arcane font-semibold">Ativo</span>
                        ) : null}
                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleUseCharacter(character)}
                          className="text-xs uppercase tracking-[0.2em] px-3 py-2 bg-white/5 rounded-full hover:bg-white/10"
                        >
                          {isInCampaign ? 'Usar nesta campanha' : 'Usar nesta campanha'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-sm text-muted">Não há personagens salvos. Crie um novo personagem para entrar na campanha.</div>
          )}
        </div>

        <div className="panel glass p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Personagens da campanha</h3>
          {campaignCharacters.length > 0 ? (
            <ul className="space-y-3 text-sm text-muted">
              {campaignCharacters.map(character => (
                <li key={character.id} className="border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{character.name}</div>
                      <div className="text-xs">{character.race} • {character.className}</div>
                      <div className="text-xs text-muted">Nv {character.level}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeCharacter?.id === character.id ? (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-arcane font-semibold">Ativo</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectCharacter(character)}
                          className="text-xs uppercase tracking-[0.2em] px-3 py-2 bg-white/5 rounded-full hover:bg-white/10"
                        >
                          Selecionar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted">Escolha ou crie um personagem para entrar nesta campanha.</div>
          )}
        </div>

        <div className="panel glass p-4 rounded-lg sticky top-6">
          <h3 className="font-semibold mb-3">Ficha ativa</h3>
          {activeCharacter ? (
            <CharacterSheet character={activeCharacter} />
          ) : (
            <div className="text-sm text-muted">Nenhum personagem salvo ainda. Crie um na página de personagem.</div>
          )}
        </div>
      </aside>
    </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
