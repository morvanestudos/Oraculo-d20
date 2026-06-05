'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getMessages, getRemoteMessages, saveMessage, savePendingTest, getCombatState, saveCombatState, getSceneState, saveSceneState, getCampaignMemory, saveCampaignMemory, getPendingTest } from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { fetchCampaignMemory, updateCampaignMemory, initializeCampaignMemory } from '../lib/api/campaigns'
import { createPusherClient } from '../lib/pusher-client'
import { analyzeAction, generateTestOutcomeMessage } from '../lib/masterEngine'
import { detectHealingAction, rollHealing, applyHeal, formatHealMessage } from '../lib/healingSystem'
import { initializeSceneState, sceneStateFromMemory, progressSceneState, narrateAction, buildMasterMessage, buildMemorySummary } from '../lib/narrativeEngine'
import type { Message, Campaign, Character, CampaignPlayer, PendingTest, CampaignMemory, AIMasterResponse, PartyMember, TurnState, Npc } from '../lib/types'
import { fetchQuests, processQuestUpdates } from '../lib/api/quests'
import { awardCharacterXp } from '../lib/api/characters'
// import { getCampaignActs, detectCampaignAct } from '../lib/campaignActs'  // DESATIVADO temporariamente
import { getPlayerId } from '../lib/storage'
import { applyNpcUpdate, buildRelationshipMessage } from '../lib/npcSystem'
import CombatPanel from './CombatPanel'
import CampaignIntroPanel from './CampaignIntroPanel'
import NarrationButton from './NarrationButton'

type ChatBoxProps = {
  campaignId: string
  campaign: Campaign
  character: Character | null
  playerName: string
  onlinePlayers?: CampaignPlayer[]
  campaignCharacters?: Character[]
  turnState?: TurnState | null
}

type RelationshipNpc = Pick<Npc, 'id' | 'name' | 'trust' | 'fear' | 'knownInfo'>

function normalizeNpcName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function findNpcForUpdate(npcs: RelationshipNpc[], npcName: string) {
  const targetLower = npcName.trim().toLowerCase()
  const exact = npcs.find(n => n.name.trim().toLowerCase() === targetLower)
  if (exact) return exact

  const targetNorm = normalizeNpcName(npcName)
  const normalized = npcs.find(n => {
    const fullName = normalizeNpcName(n.name)
    const shortName = normalizeNpcName(n.name.split(',')[0] ?? n.name)
    return fullName === targetNorm || shortName === targetNorm
  })
  if (normalized) return normalized

  if (targetNorm.length < 4) return null

  const partialMatches = npcs.filter(n => {
    const fullName = normalizeNpcName(n.name)
    const shortName = normalizeNpcName(n.name.split(',')[0] ?? n.name)
    if (shortName.length >= 4 && (shortName.includes(targetNorm) || targetNorm.includes(shortName))) return true
    if (targetNorm.length >= 6 && fullName.includes(targetNorm)) return true
    return false
  })

  return partialMatches.length === 1 ? partialMatches[0] : null
}

function mergeKnownInfo(current: string | null | undefined, incoming: string | null | undefined) {
  const next = incoming?.trim()
  if (!next) return current ?? null

  const existing = current?.trim()
  if (!existing) return next

  if (normalizeNpcName(existing).includes(normalizeNpcName(next))) return existing
  return `${existing}\n${next}`
}

export default function ChatBox({ campaignId, campaign, character, playerName, onlinePlayers = [], campaignCharacters = [], turnState }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [isMasterTyping, setIsMasterTyping] = useState(false)
  const [campaignMemory, setCampaignMemory] = useState<CampaignMemory | null>(null)
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [suggestedActionsMessageId, setSuggestedActionsMessageId] = useState<string | null>(null)
  const [showIntro, setShowIntro]   = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const messagesEndRef        = useRef<HTMLDivElement>(null)
  const scrollAreaRef         = useRef<HTMLDivElement>(null)
  const isFirstLoad           = useRef(true)
  const turnAdvanceInProgress = useRef(false)
  const lastNarratedId        = useRef<string | null>(null)   // auto-narration dedup

  // ── Auto-narration (persisted in localStorage) ─────────────────────────────
  const [autoNarrate, setAutoNarrate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('oraculoAutoNarration') === 'true'
  })

  function toggleAutoNarrate() {
    setAutoNarrate(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('oraculoAutoNarration', String(next))
        if (!next) window.speechSynthesis?.cancel()
      }
      return next
    })
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    if (isFirstLoad.current) {
      // First load: jump instantly to bottom
      scrollToBottom('auto')
      isFirstLoad.current = false
    } else {
      scrollToBottom('smooth')
    }
  }, [messages, scrollToBottom])

  // ── Auto-narration: speak new master messages ──────────────────────────────
  useEffect(() => {
    if (!autoNarrate || isFirstLoad.current) return
    const masterMsgs = messages.filter(m => m.role === 'master')
    const last = masterMsgs[masterMsgs.length - 1]
    if (!last || last.id === lastNarratedId.current) return
    lastNarratedId.current = last.id
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleaned = last.content
      .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
      .replace(/[⚔️💬🔍⚠️🎲✅❌🌟💀💚🗡️💥🛡️⏱⚔]/g, '')
      .replace(/━+/g, '').trim()
    if (!cleaned) return
    const utt = new SpeechSynthesisUtterance(cleaned)
    utt.lang = 'pt-BR'; utt.rate = 0.95; utt.pitch = 0.85; utt.volume = 1
    const setVoice = () => {
      const v = window.speechSynthesis.getVoices().find(v => v.lang === 'pt-BR') ?? null
      if (v) utt.voice = v
    }
    setVoice()
    if (!utt.voice) window.speechSynthesis.onvoiceschanged = () => { setVoice(); window.speechSynthesis.onvoiceschanged = null }
    window.speechSynthesis.speak(utt)
  }, [messages, autoNarrate])

  // Cancel speech on unmount
  useEffect(() => {
    return () => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel() }
  }, [])

  // Show "go to bottom" button when user scrolls up
  function handleScroll() {
    const el = scrollAreaRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }

  // Turn state — computed from prop
  const myPlayerId = getPlayerId()
  const turnActive = turnState?.active ?? false
  const currentActor = turnActive ? (turnState!.turnOrder[turnState!.currentTurnIndex] ?? null) : null
  const isMyTurn = !turnActive || (currentActor?.playerId === myPlayerId)

  useEffect(() => {
    let pusher: ReturnType<typeof createPusherClient> | null = null
    let channel: any = null

    async function loadMessages() {
      // Load or initialize campaign memory
      let campaignMemory = getCampaignMemory(campaignId)
      if (!campaignMemory) {
        campaignMemory = await fetchCampaignMemory(campaignId)
      }
      if (!campaignMemory) {
        campaignMemory = await initializeCampaignMemory(campaignId, campaign.title)
      }
      if (campaignMemory) {
        setCampaignMemory(campaignMemory)
        saveCampaignMemory(campaignMemory)
        saveSceneState(campaignId, sceneStateFromMemory(campaignMemory))
      }

      // Seed main quest for Taverna dos Corvos campaigns
      fetch(`/api/campaigns/${campaignId}/quests/seed`, { method: 'POST' }).catch(() => {})

      const stored = getMessages(campaignId)
      const remote = await getRemoteMessages(campaignId)

      const introAlreadySeen =
        typeof window !== 'undefined' &&
        window.localStorage.getItem(`introSeen-${campaignId}`) === 'true'

      if (remote && remote.length > 0) {
        setMessages(remote)
        setShowIntro(false)
      } else if (stored.length > 0) {
        setMessages(stored)
        setShowIntro(false)
      } else if (introAlreadySeen) {
        setShowIntro(false)
      } else {
        setShowIntro(true)
      }
    }

    loadMessages().catch(error => {
      console.error('Falha ao carregar mensagens da API, usando fallback local:', error)
      const fallback = getMessages(campaignId)
      const introAlreadySeen =
        typeof window !== 'undefined' &&
        window.localStorage.getItem(`introSeen-${campaignId}`) === 'true'
      if (fallback.length > 0) {
        setMessages(fallback)
        setShowIntro(false)
      } else if (introAlreadySeen) {
        setShowIntro(false)
      } else {
        setShowIntro(true)
      }
    })

    pusher = createPusherClient()
    if (pusher) {
      channel = pusher.subscribe(`campaign-${campaignId}`)
      channel.bind('new-message', (message: Message) => {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id || (m.author === message.author && m.content === message.content && m.role === message.role))) {
            return prev
          }
          return [...prev, message]
        })
      })
    }

    return () => {
      if (channel) {
        channel.unbind('new-message')
        pusher?.unsubscribe(`campaign-${campaignId}`)
      }
      pusher?.disconnect()
    }
  }, [campaignId])

  function markIntroSeen() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`introSeen-${campaignId}`, 'true')
    }
  }

  function handleDismissIntro() {
    markIntroSeen()
    setShowIntro(false)
  }

  async function handleStartAdventure(initialMessage: string) {
    setIsStarting(true)
    markIntroSeen()

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      campaignId,
      author: 'Mestre IA',
      role: 'master',
      content: initialMessage,
      createdAt: new Date().toISOString()
    }
    setMessages([tempMsg])

    const created = await createMessage(campaignId, {
      author: tempMsg.author,
      role: tempMsg.role,
      content: tempMsg.content
    })

    if (created) {
      saveMessage(created)
      setMessages([created])
    } else {
      saveMessage(tempMsg)
    }

    setShowIntro(false)
    setIsStarting(false)
  }

  async function sendMessage(content: string) {
    // Clear previous suggested actions when player sends a new message
    setSuggestedActions([])
    setSuggestedActionsMessageId(null)

    const tempId = `temp-${Date.now()}`
    const playerMessage: Message = {
      id: tempId,
      campaignId,
      author: playerName,
      role: 'player',
      content,
      createdAt: new Date().toISOString()
    }

    console.log('ChatBox: mensagem do jogador:', playerMessage.content)
    setMessages(prev => [...prev, playerMessage])
    setIsMasterTyping(true)

    const createdPlayerMessage = await createMessage(campaignId, {
      author: playerMessage.author,
      role: playerMessage.role,
      content: playerMessage.content
    })

    if (createdPlayerMessage) {
      saveMessage(createdPlayerMessage)
      setMessages(prev => prev.map(m => m.id === tempId ? createdPlayerMessage : m))
    } else {
      saveMessage(playerMessage)
    }

    // ── Detect and resolve healing actions ─────────────────────────────────
    try {
      const party = campaignCharacters.filter(c => c.id !== character?.id)
      const healingAction = detectHealingAction(playerMessage.content, character, party)

      if (healingAction.isHealing && character) {
        const { targetCharacterId, targetCharacterName, diceCount, diceSides, bonus, source } = healingAction
        const targetChar = [character, ...party].find(c => c.id === targetCharacterId)
        if (targetChar) {
          const { rolls, total } = rollHealing(diceCount, diceSides, bonus)
          const maxHp = Math.max(targetChar.hp, 1)  // use current as floor; ideally stored maxHp
          const prevHp = targetChar.hp
          const newHp  = applyHeal(prevHp, total, maxHp + 999)  // allow up to original max

          // Persist via API
          const campaignIdNum = campaign.id ? Number(campaign.id) : undefined
          await fetch(`/api/characters/${targetCharacterId}/hp`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hpChange: total, reason: healingAction.reason, campaignId: campaignIdNum }),
          }).catch(() => {})

          // Update local state
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('oraculo:character-updated', {
              detail: { characterId: String(targetCharacterId), hp: newHp },
            }))
          }

          // Chat message
          const healMsg = formatHealMessage({
            healerName: character.name,
            targetName: targetCharacterName,
            source, rolls, bonus, totalHealed: total,
            previousHp: prevHp, newHp, maxHp,
          })
          const healMsgCreated = await createMessage(campaignId, { author: 'Sistema', role: 'system', content: healMsg })
          if (healMsgCreated) saveMessage(healMsgCreated)
        }
      }
    } catch { /* non-fatal */ }

    // Detect combat start phrases and create combat state if none exists
    try {
      const lower = playerMessage.content.toLowerCase()
      const combatTrigger = /eu\s+ataco|eu ataco|saco minha espada|entro em combate|avanço contra o inimigo|entro em combate|ataco/.test(lower)
      const existing = getCombatState(campaignId)
      if (combatTrigger && !existing) {
        // build simple combat state with player and a generic enemy
        const playerCombatant = playerMessage.author && character ? {
          id: character.id,
          name: character.name,
          type: 'player',
          hp: character.hp,
          maxHp: character.hp,
          armorClass: character.ac,
          initiative: Math.floor(Math.random() * 20) + 1,
          isActive: false
        } : null

        const enemyCombatant = {
          id: `enemy-${Date.now()}`,
          name: 'Saqueador das Ruínas',
          type: 'enemy' as const,
          hp: 18,
          maxHp: 18,
          armorClass: 13,
          initiative: Math.floor(Math.random() * 20) + 1,
          isActive: false
        }

        const combatants = [playerCombatant, enemyCombatant].filter(Boolean) as any
        // order by initiative desc
        combatants.sort((a: any, b: any) => b.initiative - a.initiative)
        if (combatants.length > 0) combatants[0].isActive = true

        const combatState = {
          id: `combat-${Date.now()}`,
          campaignId,
          active: true,
          round: 1,
          turnIndex: 0,
          combatants,
          logs: []
        }
        saveCombatState(combatState)
        const sysMessage: Message = {
          id: `msg-${Date.now()}-sys-combat`,
          campaignId,
          author: 'Sistema',
          role: 'system',
          content: `Iniciou combate contra ${enemyCombatant.name}. Iniciativa: ${combatants.map((c:any)=>`${c.name}(${c.initiative})`).join(', ')}`,
          createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, sysMessage])
        const createdSysMessage = await createMessage(campaignId, {
          author: sysMessage.author,
          role: sysMessage.role,
          content: sysMessage.content
        })
        if (createdSysMessage) {
          saveMessage(createdSysMessage)
        } else {
          saveMessage(sysMessage)
        }
      }
    } catch (e) {
      console.error('Erro ao iniciar combate', e)
    }

    const delay = 800 + Math.floor(Math.random() * 700)
    setTimeout(async () => {
      const currentSceneState = campaignMemory ? sceneStateFromMemory(campaignMemory) : getSceneState(campaignId) ?? initializeSceneState(campaignId, campaign.title)
      const existingPendingTest = getPendingTest(campaignId)
      const recentMessages = [...messages, playerMessage]
        .slice(-10)
        .map(({ author, role, content, createdAt }) => ({ author, role, content, createdAt }))

      let aiResponse: AIMasterResponse | null = null
      try {
        const activeQuests = await fetchQuests(campaignId).then(qs =>
          qs.filter(q => q.status === 'active').map(q => ({
            title: q.title,
            description: q.description,
            progress: q.progress,
            objectiveList: q.objectiveList ?? null,
            objectives: q.objectives,
            branchKey: q.branchKey ?? null,
          }))
        ).catch(() => [])

        // Build party list: every online player that has a character linked
        const party: PartyMember[] = onlinePlayers
          .filter(p => p.characterId != null)
          .reduce<PartyMember[]>((acc, p) => {
            const char = campaignCharacters.find(c => c.id === p.characterId)
            if (!char) return acc
            acc.push({
              playerName: p.playerName,
              characterName: char.name,
              className: char.className,
              subclass: char.subclass ?? null,
              race: char.race,
              level: char.level,
            })
            return acc
          }, [])

        const playerId = getPlayerId()

        const response = await fetch(`/api/campaigns/${campaignId}/ai-master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerMessage: playerMessage.content,
            campaign,
            activeCharacter: character,
            actingPlayer: playerId ? { playerId, playerName } : null,
            party,
            recentMessages,
            campaignMemory,
            pendingTest: existingPendingTest,
            activeQuests,
            persistentNpcs: await fetch(`/api/campaigns/${campaignId}/npcs`).then(r => r.ok ? r.json() : []).catch(() => []),
          })
        })

        if (response.ok) {
          aiResponse = (await response.json()) as AIMasterResponse
        } else {
          throw new Error(`AI master retornou status ${response.status}`)
        }
      } catch (error) {
        console.error('Falha ao chamar AI Master API, usando fallback local:', error)
      }

      let actionAnalysis = analyzeAction(playerMessage.content)
      let narrativeResult = null
      let fallbackSceneState = currentSceneState

      if (!aiResponse) {
        const updatedSceneState = progressSceneState(currentSceneState, playerMessage.content, actionAnalysis.actionType)
        fallbackSceneState = updatedSceneState
        narrativeResult = narrateAction(updatedSceneState, playerMessage.content, actionAnalysis.actionType, campaignMemory)

        aiResponse = {
          narration: buildMasterMessage(narrativeResult),
          requiresRoll: Boolean(narrativeResult.testRequired),
          rollType: (actionAnalysis.testType as AIMasterResponse['rollType']) || 'nenhum',
          difficultyClass: narrativeResult.testRequired ? actionAnalysis.difficulty ?? 14 : null,
          memoryUpdates: {
            currentScene: updatedSceneState.currentScene,
            currentLocation: updatedSceneState.currentLocation,
            currentObjective: updatedSceneState.currentObjective,
            currentThreat: updatedSceneState.currentThreat,
            tensionLevel: updatedSceneState.tensionLevel,
            discoveredClues: updatedSceneState.discoveredClues,
            activeNPCs: updatedSceneState.activeNPCs,
            activeEnemies: updatedSceneState.activeEnemies,
            storyFlags: updatedSceneState.storyFlags,
            summary: buildMemorySummary(updatedSceneState, campaignMemory)
          }
        }
      }

      const masterContent = aiResponse.narration
      const memoryUpdates = aiResponse.memoryUpdates

      const updatedSceneState = {
        ...currentSceneState,
        currentScene: memoryUpdates.currentScene || currentSceneState.currentScene,
        currentLocation: memoryUpdates.currentLocation || currentSceneState.currentLocation,
        currentObjective: memoryUpdates.currentObjective || currentSceneState.currentObjective,
        currentThreat: memoryUpdates.currentThreat || currentSceneState.currentThreat,
        tensionLevel: memoryUpdates.tensionLevel ?? currentSceneState.tensionLevel,
        discoveredClues: memoryUpdates.discoveredClues || currentSceneState.discoveredClues,
        activeNPCs: memoryUpdates.activeNPCs || currentSceneState.activeNPCs,
        activeEnemies: memoryUpdates.activeEnemies || currentSceneState.activeEnemies,
        storyFlags: memoryUpdates.storyFlags || currentSceneState.storyFlags,
        turnCount: currentSceneState.turnCount + 1,
        lastPlayerAction: playerMessage.content,
        lastMasterAction: masterContent,
        environmentDetails: currentSceneState.environmentDetails,
        updatedAt: new Date().toISOString()
      }

      let pendingTest: PendingTest | undefined
      if (aiResponse.requiresRoll && aiResponse.rollType !== 'nenhum') {
        pendingTest = {
          id: `test-${Date.now()}`,
          campaignId,
          type: aiResponse.rollType as any,
          difficultyClass: aiResponse.difficultyClass ?? (actionAnalysis.difficulty ?? 14),
          reason: playerMessage.content,
          createdAt: new Date().toISOString()
        }
      }

      const tempMasterMessage: Message = {
        id: `temp-${Date.now()}-master`,
        campaignId,
        author: 'Mestre IA',
        role: 'master',
        content: masterContent,
        createdAt: new Date().toISOString()
      }

      setMessages(prev => [...prev, tempMasterMessage])
      saveSceneState(campaignId, updatedSceneState)

      let updatedMemory = campaignMemory
      if (!updatedMemory) {
        const fetched = await fetchCampaignMemory(campaignId)
        updatedMemory = fetched
      }

      if (updatedMemory) {
        let summary = memoryUpdates.summary || updatedMemory.summary || ''
        if (!summary && updatedSceneState.turnCount % 5 === 0) {
          summary = buildMemorySummary(updatedSceneState, updatedMemory)
        }

        const memoryUpdate = {
          currentScene: updatedSceneState.currentScene,
          currentLocation: updatedSceneState.currentLocation,
          currentObjective: updatedSceneState.currentObjective,
          currentThreat: updatedSceneState.currentThreat,
          tensionLevel: updatedSceneState.tensionLevel,
          discoveredClues: updatedSceneState.discoveredClues,
          activeNPCs: updatedSceneState.activeNPCs,
          activeEnemies: updatedSceneState.activeEnemies,
          storyFlags: updatedSceneState.storyFlags,
          turnCount: updatedSceneState.turnCount,
          lastPlayerAction: playerMessage.content,
          lastMasterAction: masterContent,
          summary,
          lastSummaryTurn: summary ? updatedSceneState.turnCount : updatedMemory.lastSummaryTurn
        }

        const newMemoryState = {
          ...updatedMemory,
          ...memoryUpdate
        }

        setCampaignMemory(newMemoryState)
        saveCampaignMemory(newMemoryState)

        updateCampaignMemory(campaignId, memoryUpdate).catch(error => {
          console.error('Falha ao atualizar campanha memória:', error)
        })

        // Act announcements DESATIVADAS temporariamente para estabilização
        // Para reativar: descomentar o bloco abaixo e importar detectCampaignAct/getCampaignActs
        /*
        const prevAct = detectCampaignAct(campaign.title, updatedMemory)
        const nextAct = detectCampaignAct(campaign.title, newMemoryState)
        if (nextAct > prevAct) {
          const acts = getCampaignActs(campaign.title)
          const newActData = acts.find(a => a.number === nextAct)
          const announceFlag = newActData?.announceFlag ?? `act_${nextAct}_announced`
          const alreadyAnnounced = (newMemoryState.storyFlags ?? {})[announceFlag]
          if (!alreadyAnnounced && newActData) {
            const flagUpdate = { storyFlags: { ...newMemoryState.storyFlags, [announceFlag]: true } }
            updateCampaignMemory(campaignId, flagUpdate).catch(() => {})
            createMessage(campaignId, { author: 'Sistema', role: 'system', content: `⚔️ ${newActData.title} — ${newActData.subtitle}` }).catch(() => {})
          }
        }
        */
      }

      if (pendingTest) {
        savePendingTest(pendingTest)
      }

      console.log('ChatBox: resposta do Mestre:', masterContent, pendingTest)

      const createdMasterMessage = await createMessage(campaignId, {
        author: tempMasterMessage.author,
        role: tempMasterMessage.role,
        content: tempMasterMessage.content
      })

      if (createdMasterMessage) {
        saveMessage(createdMasterMessage)
        setMessages(prev => prev.map(m => m.id === tempMasterMessage.id ? createdMasterMessage : m))
      } else {
        saveMessage(tempMasterMessage)
      }

      const actions = aiResponse.suggestedActions
      if (actions && actions.length > 0) {
        const finalId = createdMasterMessage?.id ?? tempMasterMessage.id
        setSuggestedActionsMessageId(finalId)
        setSuggestedActions(actions)
      }

      // ── Process NPC relationship updates ────────────────────────────────────
      if (aiResponse.npcUpdates && aiResponse.npcUpdates.length > 0) {
        try {
          const npcList: RelationshipNpc[] =
            await fetch(`/api/campaigns/${campaignId}/npcs`).then(r => r.ok ? r.json() : []).catch(() => [])

          for (const upd of aiResponse.npcUpdates) {
            if (!upd?.npcName) continue

            const npc = findNpcForUpdate(npcList, upd.npcName)
            if (!npc) continue

            const patch = applyNpcUpdate(npc as any, upd)
            if (upd.knownInfo) {
              const knownInfo = mergeKnownInfo(npc.knownInfo, upd.knownInfo)
              if (knownInfo) patch.knownInfo = knownInfo
            }

            if (Object.keys(patch).length === 0) continue

            await fetch(`/api/npcs/${npc.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch),
            }).catch(() => {})

            // Post relationship feedback for strong changes
            const relMsg = buildRelationshipMessage(npc.name, upd)
            if (relMsg) {
              createMessage(campaignId, { author: 'Sistema', role: 'system', content: relMsg }).catch(() => {})
            }
          }
        } catch (e) {
          console.warn('ChatBox: falha ao processar npcUpdates', e)
        }
      }

      if (aiResponse.questsUpdates && aiResponse.questsUpdates.length > 0) {
        try {
          const questEvents = await processQuestUpdates(campaignId, aiResponse.questsUpdates)
          for (const event of questEvents.slice(0, 2)) {
            const questMsg: Message = {
              id: `msg-${Date.now()}-quest-${Math.random().toString(36).slice(2)}`,
              campaignId,
              author: 'Sistema',
              role: 'system',
              content: event.message,
              createdAt: new Date().toISOString(),
            }
            setMessages(prev => [...prev, questMsg])
            createMessage(campaignId, { author: questMsg.author, role: questMsg.role, content: questMsg.content })
              .then(m => { if (m) saveMessage(m) })
              .catch(() => {})
          }

          // Award XP for each completed quest
          const completedQuests = aiResponse.questsUpdates.filter(u => u.action === 'complete')
          if (completedQuests.length > 0 && character) {
            const XP_PER_QUEST = 50
            const xpGain = completedQuests.length * XP_PER_QUEST

            const { leveledUp, newLevel } = await awardCharacterXp(
              character.id,
              xpGain,
              character.xp ?? 0,
              character.nextLevelXp ?? 100,
              character.level
            )

            // XP message
            const xpMsg: Message = {
              id: `msg-${Date.now()}-xp`,
              campaignId,
              author: 'Sistema',
              role: 'system',
              content: `${character.name} ganhou ${xpGain} XP.`,
              createdAt: new Date().toISOString(),
            }
            setMessages(prev => [...prev, xpMsg])
            createMessage(campaignId, { author: xpMsg.author, role: xpMsg.role, content: xpMsg.content })
              .then(m => { if (m) saveMessage(m) })
              .catch(() => {})

            // Level up message
            if (leveledUp) {
              const lvlMsg: Message = {
                id: `msg-${Date.now()}-levelup`,
                campaignId,
                author: 'Sistema',
                role: 'system',
                content: `✨ ${character.name} chegou ao nível ${newLevel}!`,
                createdAt: new Date().toISOString(),
              }
              setMessages(prev => [...prev, lvlMsg])
              createMessage(campaignId, { author: lvlMsg.author, role: lvlMsg.role, content: lvlMsg.content })
                .then(m => { if (m) saveMessage(m) })
                .catch(() => {})
            }
          }
        } catch (e) {
          console.error('Erro ao processar quests/XP:', e)
        }
      }

      // Handle inventory updates from AI (when prompt supports it)
      if (aiResponse.inventoryUpdates && aiResponse.inventoryUpdates.length > 0 && character) {
        try {
          const { updateCharacter } = await import('../lib/api/characters')
          const currentInventory: string[] = Array.isArray(character.inventory) ? character.inventory : []
          let updated = [...currentInventory]

          for (const upd of aiResponse.inventoryUpdates) {
            if (upd.action === 'add') {
              const entry = typeof upd.item === 'object'
                ? JSON.stringify(upd.item)
                : String(upd.item)
              if (!updated.includes(entry)) updated.push(entry)

              const sysMsg = `${character.name} recebeu: ${upd.item.name}.`
              createMessage(campaignId, { author: 'Sistema', role: 'system', content: sysMsg })
                .then(m => { if (m) { saveMessage(m); setMessages(prev => [...prev, m]) } })
                .catch(() => {})
            } else if (upd.action === 'remove') {
              updated = updated.filter(i => {
                const name = (() => { try { return JSON.parse(i)?.name ?? i } catch { return i } })()
                return (name ?? '').toLowerCase() !== (upd.item.name ?? '').toLowerCase()
              })
            }
          }

          await updateCharacter(character.id, { inventory: updated }).catch(() => {})
        } catch (e) {
          console.error('Erro ao processar inventoryUpdates:', e)
        }
      }

      setIsMasterTyping(false)

      // ── Auto-advance turn after AI responds (if no pending dice roll) ──────
      if (
        turnState?.active &&
        isMyTurn &&
        !pendingTest &&
        !turnAdvanceInProgress.current
      ) {
        turnAdvanceInProgress.current = true
        fetch(`/api/campaigns/${campaignId}/turns/next`, { method: 'POST' })
          .catch(() => {})
          .finally(() => { turnAdvanceInProgress.current = false })
      }
    }, delay)
  }

  async function send() {
    if (!text.trim()) return
    if (turnActive && !isMyTurn) return  // Block action outside turn
    const content = text.trim()
    setText('')
    setSuggestedActions([])
    setSuggestedActionsMessageId(null)
    await sendMessage(content)
  }

  async function handleSuggestedAction(action: string) {
    setSuggestedActions([])
    setSuggestedActionsMessageId(null)
    await sendMessage(action)
  }

  if (showIntro) {
    return (
      <CampaignIntroPanel
        campaign={campaign}
        onStart={handleStartAdventure}
        onDismiss={handleDismissIntro}
        isStarting={isStarting}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      <style>{`
        .narrative-choice {
          background: linear-gradient(135deg, #1c1000 0%, #2a1a00 100%);
          border: 1px solid #b8960c;
          border-radius: 3px;
          color: #e8c840;
          padding: 5px 14px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: Georgia, serif;
          letter-spacing: 0.02em;
          text-shadow: 0 0 6px rgba(232, 200, 64, 0.3);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .narrative-choice:hover {
          background: linear-gradient(135deg, #2a1a00 0%, #3d2800 100%);
          border-color: #d4af37;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.55), 0 0 20px rgba(212, 175, 55, 0.2);
          color: #f5e070;
          text-shadow: 0 0 8px rgba(245, 224, 112, 0.6);
        }
        .narrative-choice:active {
          transform: scale(0.97);
        }
      `}</style>
      {/* Turn status bar — compact, non-invasive */}
      {turnActive && currentActor && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-xs"
          style={{
            background: isMyTurn
              ? 'rgba(212,177,106,0.08)'
              : 'rgba(255,255,255,0.03)',
            borderBottom: isMyTurn
              ? '1px solid rgba(212,177,106,0.2)'
              : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ color: isMyTurn ? '#d4b16a' : 'rgba(255,255,255,0.35)' }}>
            {isMyTurn ? `⚔️ Sua vez — ${currentActor.characterName}` : `⚔️ Vez de ${currentActor.characterName}`}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>
            Modo Turnos ativo
          </span>
        </div>
      )}

      {/* ── Messages scroll area ─────────────────────────────────────────── */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="chat-scroll"
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '10px 10px 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {messages.map(m => (
            <React.Fragment key={m.id}>
              {m.role === 'system' && m.content.startsWith('⚔️ Ato') ? (
                <div className="chat-message-act-milestone">
                  <div className="act-label">{m.content}</div>
                  <div className="act-divider" />
                </div>
              ) : (
                <div
                  className={m.role === 'master' ? 'chat-message-master' : m.role === 'system' ? 'chat-message-system' : 'chat-message-player'}
                  style={{ padding: '8px 12px', wordBreak: 'break-word' }}
                >
                  <div className="flex items-center justify-between text-xs mb-1 uppercase tracking-[0.2em] text-muted">
                    <span>
                      {m.role === 'player' ? (() => {
                        const op = onlinePlayers.find(p => p.playerName === m.author)
                        const char = op?.characterId ? campaignCharacters.find(c => c.id === op.characterId) : null
                        return char ? `${char.name} · ${m.author}` : m.author
                      })() : m.author}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.role === 'master' && (
                        <NarrationButton text={m.content} compact />
                      )}
                      <span style={{ opacity: 0.4, fontSize: '0.6rem' }}>{m.role}</span>
                    </div>
                  </div>
                  <div className="text-sm" style={{ lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                </div>
              )}
              {m.id === suggestedActionsMessageId && suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1 pb-1">
                  {suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      className="narrative-choice"
                      onClick={() => handleSuggestedAction(action)}
                      disabled={isMasterTyping}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Scroll sentinel */}
          <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
        </div>

        {/* "Go to bottom" button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom('smooth')}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 12,
              zIndex: 10,
              background: 'rgba(10,8,6,0.92)',
              border: '1px solid rgba(212,177,106,0.35)',
              borderRadius: 20,
              color: '#d4b16a',
              fontSize: '0.72rem',
              padding: '5px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              transition: 'opacity 0.2s',
            }}
          >
            ↓ Última mensagem
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {isMasterTyping && (
          <div className="chat-message-master text-sm">O Mestre está narrando...</div>
        )}

        {/* Auto-narration toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleAutoNarrate}
            title={autoNarrate ? 'Desativar narração automática' : 'Ativar narração automática do Mestre'}
            style={{
              background: autoNarrate ? 'rgba(212,177,106,0.1)' : 'rgba(255,255,255,0.03)',
              border: autoNarrate ? '1px solid rgba(212,177,106,0.3)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 4,
              color: autoNarrate ? '#d4b16a' : 'rgba(255,255,255,0.25)',
              fontSize: '0.6rem',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            {autoNarrate ? '🔊 Auto-narrar: on' : '🔇 Auto-narrar: off'}
          </button>
        </div>

        {/* Turn blocker notice */}
        {turnActive && !isMyTurn && currentActor && (
          <div
            className="text-xs text-center py-2 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Aguarde sua vez. Agora é o turno de <strong style={{ color: 'rgba(212,177,106,0.8)' }}>{currentActor.characterName}</strong>.
          </div>
        )}

        <div className="chat-input" style={{ opacity: (!isMyTurn && turnActive) ? 0.4 : 1 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={(!isMyTurn && turnActive) ? `Aguardando ${currentActor?.characterName ?? '...'}` : 'Mensagem'}
            onKeyDown={e => e.key === 'Enter' && isMyTurn && send()}
            disabled={!isMyTurn && turnActive}
            style={{ cursor: (!isMyTurn && turnActive) ? 'not-allowed' : undefined }}
          />
          <button onClick={send} disabled={(!isMyTurn && turnActive) || isMasterTyping}>Enviar</button>
        </div>
      </div>
    </div>
  )
}
