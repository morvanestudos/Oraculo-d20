'use client'
import React, { useEffect, useState } from 'react'
import { getMessages, getRemoteMessages, saveMessage, savePendingTest, getCombatState, saveCombatState, getSceneState, saveSceneState, getCampaignMemory, saveCampaignMemory, getPendingTest } from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { fetchCampaignMemory, updateCampaignMemory, initializeCampaignMemory } from '../lib/api/campaigns'
import { createPusherClient } from '../lib/pusher-client'
import { analyzeAction, generateTestOutcomeMessage } from '../lib/masterEngine'
import { initializeSceneState, sceneStateFromMemory, progressSceneState, narrateAction, buildMasterMessage, buildMemorySummary } from '../lib/narrativeEngine'
import type { Message, Campaign, Character, PendingTest, CampaignMemory, AIMasterResponse } from '../lib/types'
import { fetchQuests, processQuestUpdates } from '../lib/api/quests'
import { awardCharacterXp } from '../lib/api/characters'
import CombatPanel from './CombatPanel'
import CampaignIntroPanel from './CampaignIntroPanel'

type ChatBoxProps = {
  campaignId: string
  campaign: Campaign
  character: Character | null
  playerName: string
}

export default function ChatBox({ campaignId, campaign, character, playerName }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [isMasterTyping, setIsMasterTyping] = useState(false)
  const [campaignMemory, setCampaignMemory] = useState<CampaignMemory | null>(null)
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [suggestedActionsMessageId, setSuggestedActionsMessageId] = useState<string | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

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
          }))
        ).catch(() => [])

        const response = await fetch(`/api/campaigns/${campaignId}/ai-master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerMessage: playerMessage.content,
            campaign,
            activeCharacter: character,
            recentMessages,
            campaignMemory,
            pendingTest: existingPendingTest,
            activeQuests,
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
          reason: aiResponse.rollType,
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

      if (aiResponse.questsUpdates && aiResponse.questsUpdates.length > 0) {
        try {
          await processQuestUpdates(campaignId, aiResponse.questsUpdates)

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
    }, delay)
  }

  async function send() {
    if (!text.trim()) return
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
    <div className="flex flex-col h-80">
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
      <CombatPanel campaignId={campaignId} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scroll">
        {messages.map(m => (
          <React.Fragment key={m.id}>
            <div className={m.role === 'master' ? 'chat-message-master' : m.role === 'system' ? 'chat-message-system' : 'chat-message-player'}>
              <div className="flex items-center justify-between text-xs mb-1 uppercase tracking-[0.2em] text-muted">
                <span>{m.author}</span>
                <span>{m.role}</span>
              </div>
              <div className="text-sm leading-6">{m.content}</div>
            </div>
            {m.id === suggestedActionsMessageId && suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-1 pb-1">
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
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {isMasterTyping && (
          <div className="chat-message-master text-sm">O Mestre está narrando...</div>
        )}
        <div className="chat-input">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem" onKeyDown={e => e.key === 'Enter' && send()} />
          <button onClick={send}>Enviar</button>
        </div>
      </div>
    </div>
  )
}
