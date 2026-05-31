'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  getActiveCharacter, getCampaignById, getCharacters,
  setActiveCharacter as persistActiveCharacter, saveCharacter,
  getPlayerId, getPlayerName, setPlayerName, clearPlayer,
} from '../../../lib/storage'
import { fetchCharacters, updateCharacter } from '../../../lib/api/characters'
import { createPusherClient } from '../../../lib/pusher-client'
import DiceRoller from '../../../components/DiceRoller'
import ChatBox from '../../../components/ChatBox'
import CharacterSheet from '../../../components/CharacterSheet'
import FantasyBackground from '../../../components/FantasyBackground'
import QuestLog from '../../../components/QuestLog'
import GuestEntryModal from '../../../components/GuestEntryModal'
import type { Campaign, Character, CampaignPlayer } from '../../../lib/types'

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

  // Multiuser state
  const [playerName, setPlayerNameState] = useState<string | null>(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState<CampaignPlayer[]>([])
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Copy link
  const [copied, setCopied] = useState(false)
  async function copyLink() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  // ── Online players ──────────────────────────────────────────────
  const fetchOnlinePlayers = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}/players`)
      if (res.ok) setOnlinePlayers(await res.json())
    } catch { /* silent */ }
  }, [id])

  // ── Join campaign ───────────────────────────────────────────────
  const joinCampaign = useCallback(async (name: string) => {
    const pid = getPlayerId()
    try {
      const res = await fetch(`/api/campaigns/${id}/players/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: pid, playerName: name }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('Erro ao registrar jogador:', body)
      }
      await fetchOnlinePlayers()
    } catch (error) {
      console.error('Erro ao registrar jogador:', error)
    }
  }, [id, fetchOnlinePlayers])

  // ── Link character to player ────────────────────────────────────
  const linkCharacter = useCallback(async (character: Character) => {
    const pid = getPlayerId()
    const pName = getPlayerName()
    if (!pid || !pName) return
    try {
      await fetch(`/api/campaigns/${id}/players/link-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: pid,
          characterId: character.id,
          characterName: character.name,
        }),
      })
      await fetchOnlinePlayers()
    } catch { /* silent */ }
  }, [id, fetchOnlinePlayers])

  // ── Guest entry flow ────────────────────────────────────────────
  // Run once on mount: decide whether to show modal or restore session
  useEffect(() => {
    const stored = getPlayerName()
    if (stored) {
      setPlayerNameState(stored)
    } else {
      setShowGuestModal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — only run on mount

  // Join campaign whenever playerName becomes available
  useEffect(() => {
    if (playerName) joinCampaign(playerName)
  }, [playerName, joinCampaign])

  function handleGuestJoin(name: string) {
    setPlayerName(name)
    setPlayerNameState(name)
    setShowGuestModal(false)
  }

  function handleLeaveTable() {
    clearPlayer()
    setPlayerNameState(null)
    setShowGuestModal(true)
  }

  // ── Heartbeat ───────────────────────────────────────────────────
  useEffect(() => {
    if (!playerName) return
    const pid = getPlayerId()

    heartbeatRef.current = setInterval(() => {
      fetch(`/api/campaigns/${id}/players/heartbeat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: pid }),
      }).catch(() => { /* silent */ })
    }, 20_000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [playerName, id])

  // ── Pusher — player events ──────────────────────────────────────
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`campaign-${id}`)
    channel.bind('player-joined', fetchOnlinePlayers)
    channel.bind('character-linked', fetchOnlinePlayers)

    return () => {
      channel.unbind('player-joined', fetchOnlinePlayers)
      channel.unbind('character-linked', fetchOnlinePlayers)
      pusher.unsubscribe(`campaign-${id}`)
      pusher.disconnect()
    }
  }, [id, fetchOnlinePlayers])

  // ── Periodic refresh of online players (every 30s) ─────────────
  useEffect(() => {
    fetchOnlinePlayers()
    const interval = setInterval(fetchOnlinePlayers, 30_000)
    return () => clearInterval(interval)
  }, [fetchOnlinePlayers])

  // ── Character helpers ───────────────────────────────────────────
  function mergeCharacters(remote: Character[], local: Character[]) {
    const merged = new Map<string, Character>()
    local.forEach(c => merged.set(c.id, c))
    remote.forEach(c => merged.set(c.id, c))
    return Array.from(merged.values())
  }

  async function handleUseCharacter(character: Character) {
    setJoinError(null)
    setIsJoining(true)
    const patchedCharacter = { ...character, campaignId: id }

    try {
      const updated = await updateCharacter(character.id, { campaignId: id })
      persistActiveCharacter(updated)
      setActiveCharacter(updated)
      setCampaignCharacters(prev =>
        prev.some(c => c.id === updated.id)
          ? prev.map(c => (c.id === updated.id ? updated : c))
          : [updated, ...prev]
      )
      setAvailableCharacters(prev =>
        prev.some(c => c.id === updated.id)
          ? prev.map(c => (c.id === updated.id ? updated : c))
          : [updated, ...prev]
      )
      await linkCharacter(updated)
    } catch {
      saveCharacter(patchedCharacter)
      persistActiveCharacter(patchedCharacter)
      setActiveCharacter(patchedCharacter)
      setCampaignCharacters(prev =>
        prev.some(c => c.id === patchedCharacter.id)
          ? prev.map(c => (c.id === patchedCharacter.id ? patchedCharacter : c))
          : [patchedCharacter, ...prev]
      )
      setAvailableCharacters(prev =>
        prev.map(c => (c.id === patchedCharacter.id ? patchedCharacter : c))
      )
      setJoinError('Não foi possível sincronizar com o servidor. Dados salvos localmente.')
      await linkCharacter(patchedCharacter)
    } finally {
      setIsJoining(false)
    }
  }

  function handleSelectCharacter(character: Character) {
    persistActiveCharacter(character)
    setActiveCharacter(character)
    linkCharacter(character)
  }

  // ── Campaign load ───────────────────────────────────────────────
  useEffect(() => {
    const localActiveCharacter = getActiveCharacter()
    setActiveCharacter(localActiveCharacter)

    async function loadCampaign() {
      setIsLoading(true)
      try {
        const [campaignRes, campaignChars, allChars] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetchCharacters(id),
          fetchCharacters(),
        ])
        if (!campaignRes.ok) throw new Error(`API retornou ${campaignRes.status}`)
        const campaignData: Campaign = await campaignRes.json()
        setCampaign(campaignData)
        setCampaignCharacters(campaignChars)
        const localChars = getCharacters()
        setAvailableCharacters(mergeCharacters(allChars, localChars))
        if (!localActiveCharacter && campaignChars.length > 0) {
          setActiveCharacter(campaignChars[0])
        }
      } catch {
        setError('Não foi possível carregar dados do servidor. Usando dados locais.')
        setCampaign(getCampaignById(id))
        const localChars = getCharacters()
        setCampaignCharacters(localChars.filter(c => c.campaignId === id))
        setAvailableCharacters(localChars)
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaign()
  }, [id])

  // ── Render ──────────────────────────────────────────────────────
  if (isLoading) return <div className="text-muted p-8">Carregando campanha...</div>
  if (!campaign) return <div className="text-muted p-8">Campanha não encontrada.</div>

  return (
    <FantasyBackground image="/images/bg-campaign-room.jpg" overlayIntensity={0.66}>
      {/* Guest entry modal — blocks until playerName is set */}
      {showGuestModal && <GuestEntryModal onJoin={handleGuestJoin} />}

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {error && <div className="lg:col-span-4 text-sm text-blood">{error}</div>}

            {/* ── Main area ── */}
            <div className="lg:col-span-3 space-y-4">
              <div className="panel glass p-6 rounded-lg">
                <style>{`
                  @keyframes copy-glow {
                    0%,100% { box-shadow: 0 0 0 rgba(212,177,106,0); }
                    50%     { box-shadow: 0 0 14px rgba(212,177,106,0.35); }
                  }
                  .copy-link-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0.38rem 0.85rem;
                    background: rgba(212,177,106,0.06);
                    border: 1px solid rgba(212,177,106,0.28);
                    border-radius: 5px;
                    color: #c8a85a;
                    font-size: 0.72rem;
                    font-family: Cinzel, serif;
                    letter-spacing: 0.08em;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                  }
                  .copy-link-btn:hover {
                    background: rgba(212,177,106,0.12);
                    border-color: rgba(212,177,106,0.55);
                    color: #e8d08a;
                    animation: copy-glow 1.4s ease-in-out infinite;
                  }
                  .copy-link-btn.copied {
                    background: rgba(74,222,128,0.08);
                    border-color: rgba(74,222,128,0.35);
                    color: #4ade80;
                    animation: none;
                  }
                `}</style>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold title-cinematic">{campaign.title}</h2>
                    <p className="text-sm text-muted mt-2">{campaign.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-sm text-muted">Nível {campaign.level}</div>
                    <button
                      type="button"
                      onClick={copyLink}
                      className={`copy-link-btn${copied ? ' copied' : ''}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      {copied ? 'Link copiado!' : 'Copiar link da mesa'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 panel glass p-4 rounded-lg">
                  <div className="mb-4">
                    <h3 className="font-semibold">Chat da Mesa</h3>
                    <p className="text-xs text-muted">Converse com jogadores e com o Mestre IA</p>
                  </div>
                  {campaign && (
                    <ChatBox
                      campaignId={campaign.id}
                      campaign={campaign}
                      character={activeCharacter}
                      playerName={playerName ?? 'Aventureiro'}
                    />
                  )}
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

            {/* ── Sidebar ── */}
            <aside className="space-y-4">
              {/* Quests */}
              <div className="panel glass p-4 rounded-lg">
                <QuestLog campaignId={campaign.id} />
              </div>

              {/* Online players */}
              <div className="panel glass p-4 rounded-lg">
                <h3 className="font-semibold mb-3">
                  Jogadores na mesa
                  {onlinePlayers.length > 0 && (
                    <span className="ml-2 text-xs text-arcane">({onlinePlayers.length})</span>
                  )}
                </h3>

                {/* Current session identity */}
                {playerName && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.65rem',
                    marginBottom: '0.75rem',
                    background: 'rgba(212,177,106,0.05)',
                    border: '1px solid rgba(212,177,106,0.15)',
                    borderRadius: 5,
                    gap: 8,
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#9a8060', lineHeight: 1.4 }}>
                      <span style={{ color: 'rgba(212,177,106,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.6rem' }}>
                        Conectado como
                      </span>
                      <div style={{ color: '#c8a85a', fontWeight: 600, marginTop: 1 }}>{playerName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLeaveTable}
                      style={{
                        fontSize: '0.62rem',
                        color: 'rgba(156,163,175,0.6)',
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 4,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        letterSpacing: '0.05em',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.color = '#f87171'
                        ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.3)'
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.color = 'rgba(156,163,175,0.6)'
                        ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                      }}
                    >
                      Sair da mesa
                    </button>
                  </div>
                )}

                {onlinePlayers.length === 0 ? (
                  <p className="text-sm text-muted">Aguardando jogadores...</p>
                ) : (
                  <ul className="space-y-2">
                    {onlinePlayers.map(p => {
                      const isMe = p.playerId === getPlayerId()
                      const linkedChar = campaignCharacters.find(c => c.id === p.characterId)
                        ?? availableCharacters.find(c => c.id === p.characterId)
                      return (
                        <li key={p.id} className="flex items-start gap-2 text-sm">
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#4ade80', flexShrink: 0, marginTop: 5,
                            boxShadow: '0 0 6px #4ade80',
                          }} />
                          <div>
                            <span className="font-medium">
                              {p.playerName}{isMe && <span className="text-arcane text-xs ml-1">(você)</span>}
                            </span>
                            {linkedChar && (
                              <div className="text-xs text-muted">
                                {linkedChar.name} · {linkedChar.race} {linkedChar.className}
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Use character in campaign */}
              {activeCharacter && activeCharacter.campaignId !== id && (
                <div className="panel glass p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Entrar nesta campanha</h3>
                  <div className="text-sm text-muted mb-4">
                    Seu personagem ativo não está vinculado a esta campanha.
                  </div>
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={() => handleUseCharacter(activeCharacter)}
                    className="w-full text-xs uppercase tracking-[0.2em] px-4 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-lg font-semibold"
                  >
                    {isJoining ? 'Entrando...' : 'Entrar nesta campanha'}
                  </button>
                  {joinError && <div className="text-sm text-blood mt-3">{joinError}</div>}
                </div>
              )}

              {/* My characters */}
              <div className="panel glass p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Meus personagens</h3>
                {availableCharacters.length > 0 ? (
                  <ul className="space-y-3 text-sm text-muted">
                    {availableCharacters.map(character => {
                      const isActive = activeCharacter?.id === character.id
                      const isInCampaign = character.campaignId === id
                      const myPlayer = onlinePlayers.find(p => p.playerId === getPlayerId())
                      const isLinked = myPlayer?.characterId === character.id
                      return (
                        <li key={character.id} className="border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{character.name}</div>
                              <div className="text-xs">{character.race} · {character.className}</div>
                              {isLinked && (
                                <div className="text-xs text-arcane mt-1">Vinculado à mesa</div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {isActive && (
                                <span className="text-[10px] uppercase tracking-[0.2em] text-arcane font-semibold">Ativo</span>
                              )}
                              <button
                                type="button"
                                disabled={isJoining}
                                onClick={() => handleUseCharacter(character)}
                                className="text-xs uppercase tracking-[0.2em] px-3 py-2 bg-white/5 rounded-full hover:bg-white/10"
                              >
                                {isInCampaign ? 'Usar' : 'Entrar com este'}
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="text-sm text-muted">Crie um personagem para entrar na campanha.</div>
                )}
              </div>

              {/* Campaign characters */}
              <div className="panel glass p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Personagens da campanha</h3>
                {campaignCharacters.length > 0 ? (
                  <ul className="space-y-3 text-sm text-muted">
                    {campaignCharacters.map(character => {
                      const owner = onlinePlayers.find(p => p.characterId === character.id)
                      return (
                        <li key={character.id} className="border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{character.name}</div>
                              <div className="text-xs">{character.race} · {character.className} Nv {character.level}</div>
                              {owner && (
                                <div className="text-xs text-arcane mt-1">Jogado por {owner.playerName}</div>
                              )}
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
                      )
                    })}
                  </ul>
                ) : (
                  <div className="text-sm text-muted">Nenhum personagem nesta campanha ainda.</div>
                )}
              </div>

              {/* Active character sheet */}
              <div className="panel glass p-4 rounded-lg sticky top-6">
                <h3 className="font-semibold mb-3">Ficha ativa</h3>
                {activeCharacter ? (
                  <CharacterSheet character={activeCharacter} />
                ) : (
                  <div className="text-sm text-muted">Nenhum personagem ativo. Crie um na página de personagem.</div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
