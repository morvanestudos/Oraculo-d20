import type { Campaign, Character, Message, PendingTest, CombatState, SceneState, CampaignMemory } from './types'

const PLAYER_ID_KEY = 'oraculo-d20:player-id'
const PLAYER_NAME_KEY = 'oraculo-d20:player-name'
const CAMPAIGNS_KEY = 'oraculo-d20:campaigns'
const CHARACTERS_KEY = 'oraculo-d20:characters'
const ACTIVE_CHARACTER_KEY = 'oraculo-d20:active-character'
const MESSAGES_KEY = 'oraculo-d20:messages'
const PENDING_TESTS_KEY = 'oraculo-d20:pending-tests'
const COMBAT_STATES_KEY = 'oraculo-d20:combat-states'
const SCENE_STATES_KEY = 'oraculo-d20:scene-states'
const CAMPAIGN_MEMORY_KEY = 'oraculo-d20:campaign-memories'

function isClient() {
  return typeof window !== 'undefined'
}

function parseStorage<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveStorage<T>(key: string, data: T) {
  if (!isClient()) return
  window.localStorage.setItem(key, JSON.stringify(data))
}

export function getPlayerId(): string {
  if (!isClient()) return ''
  let id = window.localStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    window.localStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export function getPlayerName(): string | null {
  if (!isClient()) return null
  return window.localStorage.getItem(PLAYER_NAME_KEY)
}

export function setPlayerName(name: string): void {
  if (!isClient()) return
  window.localStorage.setItem(PLAYER_NAME_KEY, name)
}

export function getCampaigns(): Campaign[] {
  return parseStorage<Campaign[]>(CAMPAIGNS_KEY, [])
}

export function saveCampaign(campaign: Omit<Campaign, 'players'>) {
  const current = parseStorage<Campaign[]>(CAMPAIGNS_KEY, [])
  const campaignWithPlayers: Campaign = {
    ...campaign,
    players: []
  }
  const updated = current.filter(item => item.id !== campaign.id)
  updated.unshift(campaignWithPlayers)
  saveStorage(CAMPAIGNS_KEY, updated)
}

export function getCampaignById(id: string): Campaign {
  const saved = parseStorage<Campaign[]>(CAMPAIGNS_KEY, [])
  return saved.find(c => c.id === id) ?? {
    id: 'unknown',
    title: 'Campanha desconhecida',
    theme: 'Mística',
    level: 1,
    maxPlayers: 4,
    description: 'Esta campanha não foi encontrada nos dados salvos.',
    players: []
  }
}

export function getCharacters(): Character[] {
  return parseStorage<Character[]>(CHARACTERS_KEY, [])
}

export function saveCharacter(character: Character) {
  const current = parseStorage<Character[]>(CHARACTERS_KEY, [])
  const updated = current.filter(item => item.id !== character.id)
  updated.unshift(character)
  saveStorage(CHARACTERS_KEY, updated)
  saveStorage(ACTIVE_CHARACTER_KEY, character.id)
}

export function setActiveCharacter(character: Character) {
  saveCharacter(character)
}

export function getSceneState(campaignId: string) {
  const all = parseStorage<Record<string, SceneState>>(SCENE_STATES_KEY, {})
  return all[campaignId] ?? null
}

export function saveSceneState(campaignId: string, state: SceneState) {
  const all = parseStorage<Record<string, SceneState>>(SCENE_STATES_KEY, {})
  saveStorage(SCENE_STATES_KEY, { ...all, [campaignId]: state })
}

export function getMessages(campaignId: string): Message[] {
  const allMessages = parseStorage<Record<string, Message[]>>(MESSAGES_KEY, {})
  return allMessages[campaignId] ?? []
}

export function saveMessage(message: Message) {
  const allMessages = parseStorage<Record<string, Message[]>>(MESSAGES_KEY, {})
  const campaignMessages = allMessages[message.campaignId] ?? []
  const updatedMessages = [...campaignMessages, message]
  saveStorage(MESSAGES_KEY, { ...allMessages, [message.campaignId]: updatedMessages })
}

export async function getRemoteMessages(campaignId: string): Promise<Message[] | null> {
  if (!isClient()) return null
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/messages`)
    if (!response.ok) return null
    const messages = (await response.json()) as Message[]
    return messages
  } catch {
    return null
  }
}

export async function saveMessageWithFallback(message: Message): Promise<Message | null> {
  saveMessage(message)
  if (!isClient()) return null

  try {
    const response = await fetch(`/api/campaigns/${message.campaignId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: message.author,
        role: message.role,
        content: message.content
      })
    })

    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`)
    }

    const created = (await response.json()) as Message

    if (created.id !== message.id) {
      const allMessages = parseStorage<Record<string, Message[]>>(MESSAGES_KEY, {})
      const campaignMessages = allMessages[message.campaignId] ?? []
      const updatedMessages = campaignMessages.map(m => (m.id === message.id ? created : m))
      saveStorage(MESSAGES_KEY, { ...allMessages, [message.campaignId]: updatedMessages })
    }

    return created
  } catch (error) {
    console.error('Falha ao salvar mensagem no banco:', error)
    return null
  }
}

export function clearMessages(campaignId: string) {
  const allMessages = parseStorage<Record<string, Message[]>>(MESSAGES_KEY, {})
  if (allMessages[campaignId]) {
    delete allMessages[campaignId]
    saveStorage(MESSAGES_KEY, allMessages)
  }
}

export function getPendingTest(campaignId: string): PendingTest | null {
  const allPending = parseStorage<Record<string, PendingTest>>(PENDING_TESTS_KEY, {})
  return allPending[campaignId] ?? null
}

export function savePendingTest(test: PendingTest) {
  const allPending = parseStorage<Record<string, PendingTest>>(PENDING_TESTS_KEY, {})
  saveStorage(PENDING_TESTS_KEY, { ...allPending, [test.campaignId]: test })
}

export function clearPendingTest(campaignId: string) {
  const allPending = parseStorage<Record<string, PendingTest>>(PENDING_TESTS_KEY, {})
  if (allPending[campaignId]) {
    delete allPending[campaignId]
    saveStorage(PENDING_TESTS_KEY, allPending)
  }
}

export function getActiveCharacter(): Character | null {
  const activeId = parseStorage<string | null>(ACTIVE_CHARACTER_KEY, null)
  const characters = parseStorage<Character[]>(CHARACTERS_KEY, [])
  if (activeId) {
    return characters.find(item => item.id === activeId) ?? null
  }
  return characters[0] ?? null
}

export function getCombatState(campaignId: string): CombatState | null {
  const all = parseStorage<Record<string, CombatState>>(COMBAT_STATES_KEY, {})
  return all[campaignId] ?? null
}

export function saveCombatState(state: CombatState) {
  const all = parseStorage<Record<string, CombatState>>(COMBAT_STATES_KEY, {})
  saveStorage(COMBAT_STATES_KEY, { ...all, [state.campaignId]: state })
}

export function clearCombatState(campaignId: string) {
  const all = parseStorage<Record<string, CombatState>>(COMBAT_STATES_KEY, {})
  if (all[campaignId]) {
    delete all[campaignId]
    saveStorage(COMBAT_STATES_KEY, all)
  }
}

export function getCampaignMemory(campaignId: string): CampaignMemory | null {
  const all = parseStorage<Record<string, CampaignMemory>>(CAMPAIGN_MEMORY_KEY, {})
  return all[campaignId] ?? null
}

export function saveCampaignMemory(memory: CampaignMemory) {
  const all = parseStorage<Record<string, CampaignMemory>>(CAMPAIGN_MEMORY_KEY, {})
  saveStorage(CAMPAIGN_MEMORY_KEY, { ...all, [memory.campaignId]: memory })
}

export function clearCampaignMemory(campaignId: string) {
  const all = parseStorage<Record<string, CampaignMemory>>(CAMPAIGN_MEMORY_KEY, {})
  if (all[campaignId]) {
    delete all[campaignId]
    saveStorage(CAMPAIGN_MEMORY_KEY, all)
  }
}
