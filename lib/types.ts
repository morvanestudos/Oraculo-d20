export type Player = {
  id: string
  name: string
  characterName: string
  level: number
}

export type Campaign = {
  id: string
  title: string
  theme: string
  level: number
  maxPlayers: number
  description: string
  players: Player[]
  createdAt?: string
  hasAccessCode?: boolean
}

export type CampaignCreateDTO = {
  title: string
  description: string
  theme?: string | null
  level?: number | null
  maxPlayers?: number | null
  accessCode?: string | null
}

export type CampaignDTO = {
  id: string
  title: string
  description: string
  theme: string | null
  level: number | null
  maxPlayers: number | null
  createdAt: string
  players: Player[]
  hasAccessCode?: boolean
}

export type CharacterAttributes = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type Character = {
  id: string
  name: string
  race: string
  className: string
  level: number
  hp: number
  ac: number
  attributes: CharacterAttributes
  inventory: string[]
  story: string
  prologue?: string | null
  campaignId?: string | null
  createdAt?: string
}

export type CharacterCreateDTO = {
  name: string
  race: string
  class?: string | null
  level?: number | null
  hp?: number | null
  armorClass?: number | null
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
  inventory?: string[]
  backstory?: string | null
  campaignId?: string | null
}

export type CharacterPatchDTO = Partial<{
  name: string
  race: string
  class: string | null
  level: number | null
  hp: number | null
  armorClass: number | null
  strength: number | null
  dexterity: number | null
  constitution: number | null
  intelligence: number | null
  wisdom: number | null
  charisma: number | null
  inventory: string[]
  backstory: string | null
  prologue: string | null
  campaignId: string | null
}>

export type CharacterDTO = {
  id: string
  name: string
  race: string
  className: string
  level: number
  hp: number
  ac: number
  attributes: CharacterAttributes
  inventory: string[]
  story: string
  campaignId?: string | null
  createdAt: string
}

export type MessageRole = 'player' | 'master' | 'system'

export type Message = {
  id: string
  campaignId: string
  author: string
  role: MessageRole
  content: string
  createdAt: string
}

export type MessageCreateDTO = {
  author: string
  role: MessageRole
  content: string
}

export type MessageDTO = Message

type TestType = 'ataque' | 'percepcao' | 'investigacao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | 'geral'

export type PendingTest = {
  id: string
  campaignId: string
  type: TestType
  difficultyClass: number
  reason: string
  createdAt: string
}

export type AIMasterRequest = {
  playerMessage: string
  campaign: Campaign
  activeCharacter: Character | null
  recentMessages: Pick<Message, 'author' | 'role' | 'content' | 'createdAt'>[]
  campaignMemory: CampaignMemory | null
  pendingTest?: PendingTest | null
}

export type CampaignPlayer = {
  id: string
  campaignId: string
  playerId: string
  playerName: string
  characterId: string | null
  ready: boolean
  joinedAt: string
  lastSeenAt: string
}

export type CampaignPlayerJoinDTO = {
  playerId: string
  playerName: string
}

export type Quest = {
  id: string
  campaignId: string
  title: string
  description: string | null
  status: 'active' | 'completed' | 'failed'
  progress: string | null
  reward: string | null
  createdAt: string
  updatedAt: string
}

export type QuestCreateDTO = {
  title: string
  description?: string | null
  reward?: string | null
}

export type QuestPatchDTO = Partial<{
  title: string
  description: string | null
  status: 'active' | 'completed' | 'failed'
  progress: string | null
  reward: string | null
}>

export type QuestUpdate = {
  action: 'create' | 'update' | 'complete' | 'fail'
  title: string
  description?: string
  progress?: string
  reward?: string
}

export type AIMasterResponse = {
  narration: string
  requiresRoll: boolean
  rollType: 'ataque' | 'investigacao' | 'percepcao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | 'geral' | 'nenhum'
  difficultyClass: number | null
  suggestedActions?: string[]
  questsUpdates?: QuestUpdate[]
  memoryUpdates: {
    currentScene: string
    currentLocation: string
    currentObjective: string
    currentThreat: string
    tensionLevel: number
    discoveredClues: string[]
    activeNPCs: ActiveNPC[]
    activeEnemies: string[]
    storyFlags: Record<string, boolean>
    summary: string
  }
}

export type ActiveNPC = {
  name: string
  role: string
  mood: string
  knownInfo: string
}

export type SceneState = {
  campaignId: string
  currentScene: string
  currentLocation: string
  currentObjective: string
  currentThreat: string
  tensionLevel: number
  discoveredClues: string[]
  activeNPCs: ActiveNPC[]
  activeEnemies: string[]
  storyFlags: Record<string, boolean>
  turnCount: number
  lastPlayerAction: string
  lastMasterAction: string
  environmentDetails: string[]
  updatedAt: string
}

export type CampaignMemory = {
  id: string
  campaignId: string
  currentScene: string
  currentLocation: string
  currentObjective: string
  currentThreat: string
  tensionLevel: number
  discoveredClues: string[]
  activeNPCs: ActiveNPC[]
  activeEnemies: string[]
  storyFlags: Record<string, boolean>
  turnCount: number
  lastPlayerAction: string
  lastMasterAction: string
  summary: string | null
  lastSummaryTurn: number
  updatedAt: string
  createdAt: string
}

export type CampaignMemoryUpdateDTO = Partial<{
  currentScene: string
  currentLocation: string
  currentObjective: string
  currentThreat: string
  tensionLevel: number
  discoveredClues: string[]
  activeNPCs: ActiveNPC[]
  activeEnemies: string[]
  storyFlags: Record<string, boolean>
  turnCount: number
  lastPlayerAction: string
  lastMasterAction: string
  summary: string | null
  lastSummaryTurn: number
}>

export type Profile = {
  id: string
  email: string
  username?: string
  avatar_url?: string
  created_at?: string
}

export type SupabaseCampaign = {
  id: string
  title: string
  style: string
  level: number
  max_players: number
  description: string
  owner_id: string
  created_at?: string
}

export type SupabaseCharacter = {
  id: string
  name: string
  race: string
  class_name: string
  level: number
  hp: number
  ac: number
  attributes: Record<string, number>
  inventory: string[]
  story: string
  campaign_id?: string
  owner_id: string
}

export type SupabaseMessage = {
  id: string
  campaign_id: string
  author: string
  role: MessageRole
  content: string
  created_at?: string
}

export type SupabaseCombat = {
  id: string
  campaign_id: string
  active: boolean
  round: number
  turn_index: number
  combatants: unknown
  logs: unknown
  created_at?: string
}

export type Combatant = {
  id: string
  name: string
  type: 'player' | 'enemy'
  hp: number
  maxHp: number
  armorClass: number
  initiative: number
  isActive: boolean
}

export type CombatLog = {
  id: string
  combatId: string
  text: string
  createdAt: string
}

export type CombatState = {
  id: string
  campaignId: string
  active: boolean
  round: number
  turnIndex: number
  combatants: Combatant[]
  logs: CombatLog[]
}
