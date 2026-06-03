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
import CharacterPickerModal from '../../../components/CharacterPickerModal'
import WaitingRoomPanel from '../../../components/WaitingRoomPanel'
import AccessCodeModal from '../../../components/AccessCodeModal'
import ProloguePanel from '../../../components/ProloguePanel'
import WorldStatusPanel from '../../../components/WorldStatusPanel'
import NpcPanel from '../../../components/NpcPanel'
import ValdrakMap from '../../../components/ValdrakMap'
// import CampaignActsPanel from '../../../components/CampaignActsPanel'  // DESATIVADO temporariamente
import TurnOrderPanel from '../../../components/TurnOrderPanel'
import CombatPanel from '../../../components/CombatPanel'
import MobileGameHud, { type MobilePanel } from '../../../components/MobileGameHud'
import { TAVERNA_INITIAL_MESSAGE } from '../../../components/CampaignIntroPanel'
import type { Campaign, Character, CampaignPlayer, TurnState } from '../../../lib/types'

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
  // null = loading/unknown | false = no char linked | true = char linked
  const [characterLinked, setCharacterLinked] = useState<boolean | null>(null)
  // null = loading | false = waiting room | true = started
  const [campaignStarted, setCampaignStarted] = useState<boolean | null>(null)
  const [isStartingCampaign, setIsStartingCampaign] = useState(false)
  // Access code gate — null = loading | false = blocked | true = granted
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null)
  // Prologue
  const [showPrologue, setShowPrologue] = useState(false)
  const [prologueText, setPrologueText] = useState<string | null>(null)
  const [prologueLoading, setPrologueLoading] = useState(false)
  const [prologueRegenCount, setPrologueRegenCount] = useState(0)

  // Turn state — updated by TurnOrderPanel callback + Pusher
  const [turnState, setTurnState] = useState<TurnState | null>(null)

  // Mobile HUD active panel
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('chat')

  // Sync activeCharacter HP when DiceRoller updates it via custom event
  useEffect(() => {
    function onCharUpdated(e: Event) {
      const { characterId, hp } = (e as CustomEvent<{ characterId: string; hp: number }>).detail
      setActiveCharacter(prev => {
        if (!prev || prev.id !== characterId) return prev
        return { ...prev, hp }
      })
      // Also update campaignCharacters list
      setCampaignCharacters(prev =>
        prev.map(c => c.id === characterId ? { ...c, hp } : c)
      )
    }
    window.addEventListener('oraculo:character-updated', onCharUpdated)
    return () => window.removeEventListener('oraculo:character-updated', onCharUpdated)
  }, [])

  // Copy link
  const [copied, setCopied] = useState(false)
  async function copyLink() {
    const url = window.location.href
    const storedCode = typeof window !== 'undefined'
      ? window.localStorage.getItem(`accessCode-${id}`)
      : null
    const text = storedCode && campaign
      ? `Entre na aventura ${campaign.title}: ${url}\nCódigo da mesa: ${storedCode}`
      : url
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
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
    channel.bind('player-updated', fetchOnlinePlayers)
    channel.bind('campaign-started', () => setCampaignStarted(true))

    return () => {
      channel.unbind('player-joined', fetchOnlinePlayers)
      channel.unbind('character-linked', fetchOnlinePlayers)
      channel.unbind('player-updated', fetchOnlinePlayers)
      channel.unbind('campaign-started', () => setCampaignStarted(true))
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

  // ── Detect if current player has a character linked ─────────────
  useEffect(() => {
    if (!playerName) return
    if (onlinePlayers.length === 0) return
    const myPlayer = onlinePlayers.find(p => p.playerId === getPlayerId())
    if (myPlayer) {
      setCharacterLinked(myPlayer.characterId != null)
    }
  }, [onlinePlayers, playerName])

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
      setCharacterLinked(true)
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
      setCharacterLinked(true)
    } finally {
      setIsJoining(false)
    }
  }

  function handleSelectCharacter(character: Character) {
    persistActiveCharacter(character)
    setActiveCharacter(character)
    linkCharacter(character)
    setCharacterLinked(true)
  }

  async function handleToggleReady(ready: boolean) {
    const pid = getPlayerId()
    try {
      await fetch(`/api/campaigns/${id}/players/ready`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: pid, ready }),
      })
      await fetchOnlinePlayers()
    } catch (error) {
      console.error('Erro ao atualizar status pronto:', error)
    }
  }

  async function handleStartCampaign() {
    if (isStartingCampaign) return
    setIsStartingCampaign(true)
    try {
      const isTaverna = (campaign?.title ?? '').toLowerCase().includes('taverna dos corvos')
      const initialMessage = isTaverna
        ? TAVERNA_INITIAL_MESSAGE
        : campaign?.description
          ? `${campaign.description}\n\nO Mestre aguarda. Apresentem seus personagens e declarem suas primeiras ações.`
          : 'A aventura começa. O Mestre aguarda a primeira ação dos aventureiros.'

      const res = await fetch(`/api/campaigns/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessage }),
      })
      if (!res.ok) throw new Error(`start retornou ${res.status}`)
      setCampaignStarted(true)
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error)
    } finally {
      setIsStartingCampaign(false)
    }
  }

  async function handleGeneratePrologue(forceRegen = false) {
    if (!activeCharacter || !campaign) return
    setShowPrologue(true)

    if (!forceRegen) {
      const cached = typeof window !== 'undefined'
        ? window.localStorage.getItem(`characterPrologue-${id}-${activeCharacter.id}`)
        : null
      if (cached) {
        setPrologueText(cached)
        setPrologueLoading(false)
        return
      }
    }

    setPrologueLoading(true)
    setPrologueText(null)
    try {
      const res = await fetch(`/api/campaigns/${id}/prologue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: activeCharacter.id,
          character: activeCharacter,
          campaign,
        }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const { prologue } = await res.json()
      setPrologueText(prologue)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`characterPrologue-${id}-${activeCharacter.id}`, prologue)
      }
      setPrologueRegenCount(c => c + 1)
    } catch (error) {
      console.error('Erro ao gerar prólogo:', error)
      setPrologueText('Não foi possível gerar o prólogo. Tente novamente.')
    } finally {
      setPrologueLoading(false)
    }
  }

  // ── Campaign load ───────────────────────────────────────────────
  useEffect(() => {
    const localActiveCharacter = getActiveCharacter()
    setActiveCharacter(localActiveCharacter)

    async function loadCampaign() {
      setIsLoading(true)
      try {
        const [campaignRes, campaignChars, allChars, messagesRes, memoryRes] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetchCharacters(id),
          fetchCharacters(),
          fetch(`/api/campaigns/${id}/messages`),
          fetch(`/api/campaigns/${id}/memory`),
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

        // Determine if campaign has already started
        const messages = messagesRes.ok ? await messagesRes.json() : []
        const memory = memoryRes.ok ? await memoryRes.json() : null
        const started = messages.length > 0 || memory?.storyFlags?.campaignStarted === true
        setCampaignStarted(started)

        // Access code gate
        if (!campaignData.hasAccessCode) {
          setAccessGranted(true)
        } else {
          const stored = typeof window !== 'undefined'
            && window.localStorage.getItem(`accessGranted-${id}`) === 'true'
          setAccessGranted(stored ? true : false)
        }
      } catch {
        setError('Não foi possível carregar dados do servidor. Usando dados locais.')
        setCampaign(getCampaignById(id))
        const localChars = getCharacters()
        setCampaignCharacters(localChars.filter(c => c.campaignId === id))
        setAvailableCharacters(localChars)
        setCampaignStarted(false)
        setAccessGranted(true) // can't verify on error → allow (fail open)
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaign()
  }, [id])

  // ── Render ──────────────────────────────────────────────────────
  if (isLoading) return <div className="text-muted p-8 italic">O Mestre Arcano prepara os pergaminhos...</div>
  if (!campaign) return <div className="text-muted p-8">Campanha não encontrada.</div>

  return (
    <FantasyBackground image="/images/bg-campaign-room.jpg" overlayIntensity={0.66}>
      {/* Access code gate — highest priority, blocks everything */}
      {accessGranted === false && campaign && (
        <AccessCodeModal
          campaignId={id}
          campaignTitle={campaign.title}
          onAccessGranted={(code) => {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(`accessGranted-${id}`, 'true')
              window.localStorage.setItem(`accessCode-${id}`, code)
            }
            setAccessGranted(true)
          }}
        />
      )}

      {/* Guest entry modal — blocks until playerName is set */}
      {showGuestModal && <GuestEntryModal onJoin={handleGuestJoin} />}

      {/* Character picker — blocks until player links a character */}
      {!showGuestModal && characterLinked === false && (
        <CharacterPickerModal
          campaignId={id}
          availableCharacters={availableCharacters}
          onlinePlayers={onlinePlayers}
          onSelect={handleUseCharacter}
          isJoining={isJoining}
        />
      )}

      {/* Waiting room — blocks until campaign starts */}
      {!showGuestModal && characterLinked !== false && campaignStarted === false && campaign && (
        <WaitingRoomPanel
          campaign={campaign}
          players={onlinePlayers}
          allCharacters={[...campaignCharacters, ...availableCharacters]}
          myPlayerId={getPlayerId()}
          onToggleReady={handleToggleReady}
          onStartCampaign={handleStartCampaign}
          isStarting={isStartingCampaign}
          onGeneratePrologue={() => handleGeneratePrologue(false)}
          hasPrologue={
            typeof window !== 'undefined' && activeCharacter != null &&
            window.localStorage.getItem(`characterPrologue-${id}-${activeCharacter.id}`) != null
          }
        />
      )}

      {/* Prologue panel */}
      {showPrologue && (
        <ProloguePanel
          text={prologueText}
          loading={prologueLoading}
          characterName={activeCharacter?.name}
          regenCount={prologueRegenCount}
          onAccept={() => setShowPrologue(false)}
          onRegenerate={() => handleGeneratePrologue(true)}
        />
      )}

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

              {/* ── Chat + DiceRoller ── */}
              <div className="panel glass rounded-lg overflow-hidden">
                {/* Header row: title + dice */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <h3 className="font-semibold text-sm">Chat da Mesa</h3>
                    <p className="text-xs text-muted">Converse com jogadores e com o Mestre IA</p>
                  </div>
                  {campaign && characterLinked !== false && campaignStarted === true && (() => {
                    const myPid = getPlayerId()
                    const turnActive = turnState?.active ?? false
                    const currentActor = turnActive ? (turnState!.turnOrder[turnState!.currentTurnIndex] ?? null) : null
                    const isMyTurn = !turnActive || currentActor?.playerId === myPid
                    return (
                      <DiceRoller
                        campaignId={campaign.id}
                        isMyTurn={isMyTurn}
                        currentActorName={!isMyTurn ? currentActor?.characterName : null}
                      />
                    )
                  })()}
                </div>

                {/* Chat body */}
                <div className="p-2" style={{ minHeight: '560px' }}>
                  {campaign && (characterLinked === false || campaignStarted === false) ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 400,
                      background: 'rgba(212,177,106,0.03)',
                      border: '1px dashed rgba(212,177,106,0.15)',
                      borderRadius: 8,
                      color: '#7a6040', fontSize: '0.82rem',
                      fontFamily: 'Georgia, serif', fontStyle: 'italic',
                      textAlign: 'center', padding: '1rem',
                    }}>
                      {characterLinked === false
                        ? 'Escolha um personagem para começar a jogar.'
                        : 'Aguardando aventureiros se prepararem.'}
                    </div>
                  ) : campaign && campaignStarted === true && (
                    <ChatBox
                      campaignId={campaign.id}
                      campaign={campaign}
                      character={activeCharacter}
                      playerName={playerName ?? 'Aventureiro'}
                      onlinePlayers={onlinePlayers}
                      campaignCharacters={campaignCharacters}
                      turnState={turnState}
                    />
                  )}
                </div>
              </div>

              <WorldStatusPanel
                campaignId={id}
                campaignTitle={campaign.title}
              />
            </div>

            {/* ── Sidebar ── */}
            <aside className="space-y-4">
              {/* Map */}
              <ValdrakMap campaignId={campaign.id} campaignTitle={campaign.title} />

              {/* NPCs */}
              <NpcPanel campaignId={campaign.id} campaignTitle={campaign.title} />

              {/* Quests */}
              <div className="panel glass p-4 rounded-lg">
                <QuestLog campaignId={campaign.id} />
              </div>

              {/* Combat panel — only shown when combat is active */}
              <CombatPanel campaignId={campaign.id} />

              {/* Turn Order */}
              <TurnOrderPanel
                campaignId={campaign.id}
                onTurnStateChange={setTurnState}
              />

              {/* Campaign Acts — DESATIVADO temporariamente para estabilização
              <CampaignActsPanel
                campaignId={campaign.id}
                campaignTitle={campaign.title}
              />
              */}

              {/* Online players */}
              <div className="panel glass p-4 rounded-lg">
                <h3 className="font-semibold mb-3">
                  Aventureiros Presentes
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
                  
                   >
                      Sair da mesa
                    </button>
                  </div>
                )}

                {onlinePlayers.length === 0 ? (
                  <p className="text-sm text-muted italic">Nenhum aventureiro chegou ao salão.</p>
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
                  <h3 className="font-semibold mb-3">Juntar-se à Expedição</h3>
                  <div className="text-sm text-muted mb-4">
                    Seu herói ainda não adentrou esta aventura.
                  </div>
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={() => handleUseCharacter(activeCharacter)}
                    className="w-full text-xs uppercase tracking-[0.2em] px-4 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-lg font-semibold"
                  >
                    {isJoining ? 'Atravessando os portões...' : 'Juntar-se à Expedição'}
                  </button>
                  {joinError && <div className="text-sm text-blood mt-3">{joinError}</div>}
                </div>
              )}

              {/* My characters */}
              <div className="panel glass p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Companheiros de Jornada</h3>
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
                  <div className="text-sm text-muted italic">Nenhum herói forjado ainda. Visite o Salão dos Heróis.</div>
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
                  <div className="text-sm text-muted italic">Nenhum herói adentrou esta aventura ainda.</div>
                )}
              </div>

              {/* Active character sheet */}
              <div className="panel glass p-4 rounded-lg sticky top-6">
                <h3 className="font-semibold mb-3">Ficha ativa</h3>
                {activeCharacter ? (
                  <CharacterSheet character={activeCharacter} />
                ) : (
                  <div className="text-sm text-muted italic">Nenhum herói ativo. Forje um no Salão dos Heróis.</div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
