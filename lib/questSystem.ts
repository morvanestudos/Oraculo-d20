import type { Quest, QuestCreateDTO, QuestObjective, QuestPatchDTO, QuestUpdate } from './types'
import { TAVERNA_CAMPAIGN } from './officialCampaigns'

export type QuestFeedbackEvent = {
  type: 'created' | 'objective' | 'consequence' | 'completed' | 'failed'
  message: string
}

export const TAVERNA_MAIN_QUEST: QuestCreateDTO = TAVERNA_CAMPAIGN.mainQuest

const BRANCH_QUESTS: Record<string, QuestCreateDTO> = {
  arvik_trust: {
    title: 'A Porta dos Fundos',
    description: 'Arvik deixou escapar que alguém usou a porta dos fundos durante a madrugada.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'arvik_trust',
    priority: 60,
    objectiveList: [
      { id: 'inspect_symbol', label: 'Examinar o símbolo gravado na madeira', status: 'active', completedAt: null },
      { id: 'follow_mud_tracks', label: 'Seguir as pegadas na lama', status: 'active', completedAt: null },
      { id: 'identify_late_exit', label: 'Descobrir quem saiu pela porta durante a madrugada', status: 'active', completedAt: null },
    ],
    reward: 'Pista sobre a rota dos desaparecimentos',
  },
  elenna_help: {
    title: 'O Último Pertence',
    description: 'Elenna confia ao grupo o tecido negro encontrado entre as coisas do marido.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'elenna_help',
    priority: 55,
    objectiveList: [
      { id: 'inspect_black_cloth', label: 'Examinar o tecido negro do marido de Elenna', status: 'active', completedAt: null },
      { id: 'ask_about_symbol', label: 'Perguntar sobre o símbolo bordado', status: 'active', completedAt: null },
      { id: 'compare_cult_marks', label: 'Comparar o tecido com marcas do culto', status: 'active', completedAt: null },
    ],
    reward: 'Pista sobre o culto',
  },
  social_threat: {
    title: 'Informações por Conta Própria',
    description: 'A hostilidade fechou portas na vila. O grupo terá de buscar pistas sem cooperação.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'social_threat',
    priority: 45,
    objectiveList: [
      { id: 'find_solo_clues', label: 'Encontrar informações por conta própria', status: 'active', completedAt: null },
    ],
    consequences: [
      { type: 'npc_trust', npcName: 'Arvik', value: -2 },
    ],
  },
  early_combat: {
    title: 'Sangue na Chuva',
    description: 'O combate chegou cedo a Valdrak. O corpo do inimigo pode carregar respostas.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'early_combat',
    priority: 50,
    objectiveList: [
      { id: 'survive_attack', label: 'Sobreviver ao ataque', status: 'active', completedAt: null },
      { id: 'inspect_enemy_body', label: 'Examinar o corpo do inimigo', status: 'active', completedAt: null },
      { id: 'collect_loot_clues', label: 'Recolher pistas do loot', status: 'active', completedAt: null },
    ],
  },
  elenna_trust: {
    title: 'O Livro que Reescreve a Si Mesmo',
    description: 'Elenna permite acesso a um volume arcano que muda suas próprias páginas quando alguém menciona os esquecidos.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'elenna_trust',
    priority: 60,
    objectiveList: [
      { id: 'gain_elenna_trust', label: 'Ganhar a confiança de Elenna', status: 'active', completedAt: null },
      { id: 'read_rewriting_book', label: 'Examinar o livro que muda sozinho', status: 'active', completedAt: null },
      { id: 'recover_eldric_entry', label: 'Recuperar uma entrada sobre Eldric', status: 'active', completedAt: null },
    ],
    reward: 'Pista sobre registros perdidos',
  },
  faceless_man: {
    title: 'O Homem Sem Rosto',
    description: 'Relatos de desaparecimentos apontam para uma figura sem rosto preservada em retratos alterados.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'faceless_man',
    priority: 55,
    objectiveList: [
      { id: 'collect_portrait_reports', label: 'Coletar relatos de retratos alterados', status: 'active', completedAt: null },
      { id: 'identify_faceless_mark', label: 'Identificar a marca deixada pela figura sem rosto', status: 'active', completedAt: null },
    ],
    reward: 'Pista sobre o Rei Sem Nome',
  },
  arena_blood: {
    title: 'Sangue na Arena',
    description: 'Um torneio da Arena de Combate esconde apostas, sumiços e lutadores apagados da memória da plateia.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'arena_blood',
    priority: 50,
    objectiveList: [
      { id: 'enter_or_investigate_arena', label: 'Entrar no torneio ou investigar os bastidores', status: 'active', completedAt: null },
      { id: 'find_missing_fighter', label: 'Encontrar evidência de um lutador apagado', status: 'active', completedAt: null },
    ],
    reward: 'Reputação na Guilda dos Aventureiros',
  },
  black_market: {
    title: 'Segredos do Mercado Negro',
    description: 'O Distrito Baixo guarda documentos vendidos antes de sumirem dos registros oficiais.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'black_market',
    priority: 50,
    objectiveList: [
      { id: 'reach_lower_district', label: 'Encontrar uma rota segura pelo Distrito Baixo', status: 'active', completedAt: null },
      { id: 'buy_or_steal_lost_records', label: 'Obter registros perdidos no mercado negro', status: 'active', completedAt: null },
    ],
    reward: 'Contato com a Companhia das Sombras',
  },
  aurora_catacombs: {
    title: 'As Catacumbas de Aurora',
    description: 'Os esgotos antigos escondem uma rota para as catacumbas bloqueadas sob a cidade.',
    status: 'active',
    questType: 'secondary',
    branchKey: 'aurora_catacombs',
    priority: 55,
    objectiveList: [
      { id: 'enter_old_sewers', label: 'Entrar nos esgotos antigos', status: 'active', completedAt: null },
      { id: 'survive_under_city', label: 'Sobreviver aos monstros subterrâneos', status: 'active', completedAt: null },
      { id: 'unlock_catacombs', label: 'Desbloquear o acesso às Catacumbas Antigas', status: 'active', completedAt: null },
    ],
    reward: 'Desbloqueio das Catacumbas Antigas',
  },
}

export function getBranchQuest(branchKey?: string | null, title?: string): QuestCreateDTO | null {
  if (branchKey && BRANCH_QUESTS[branchKey]) return BRANCH_QUESTS[branchKey]
  const normalized = normalizeQuestTitle(title ?? '')
  return Object.values(BRANCH_QUESTS).find(q => normalizeQuestTitle(q.title) === normalized) ?? null
}

export function normalizeQuestTitle(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findQuestByTitle(quests: Quest[], title: string) {
  const target = normalizeQuestTitle(title)
  return quests.find(q => normalizeQuestTitle(q.title) === target)
    ?? quests.find(q => normalizeQuestTitle(q.title).includes(target) || target.includes(normalizeQuestTitle(q.title)))
    ?? null
}

export function preventDuplicateQuest(quests: Quest[], dto: QuestCreateDTO) {
  return !findQuestByTitle(quests, dto.title)
}

function objectiveDone(objective: QuestObjective) {
  return objective.status === 'completed' || objective.done === true
}

export function mergeQuestObjectives(current: QuestObjective[] = [], incoming: QuestObjective[] = []) {
  const map = new Map<string, QuestObjective>()
  current.forEach(obj => map.set(obj.id, normalizeObjective(obj)))
  incoming.forEach(obj => {
    const prev = map.get(obj.id)
    map.set(obj.id, normalizeObjective({ ...prev, ...obj }))
  })
  return Array.from(map.values())
}

export function completeObjective(objectives: QuestObjective[] = [], objectiveId: string, status: QuestObjective['status'] = 'completed') {
  let changed = false
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const next = objectives.map(obj => {
    if (obj.id !== objectiveId) return normalizeObjective(obj)
    changed = true
    return normalizeObjective({ ...obj, status, done: status === 'completed', completedAt })
  })
  return { objectives: next, changed }
}

export function applyQuestUpdate(quest: Quest, update: QuestUpdate): { patch: QuestPatchDTO; events: QuestFeedbackEvent[] } {
  const patch: QuestPatchDTO = {}
  const events: QuestFeedbackEvent[] = []

  if (update.progress != null) patch.progress = update.progress
  if (update.description != null) patch.description = update.description
  if (update.reward != null) patch.reward = update.reward
  if (update.branchKey != null) patch.branchKey = update.branchKey
  if (update.consequences != null) patch.consequences = update.consequences

  const objectives = quest.objectiveList?.length ? quest.objectiveList : quest.objectives
  if (update.objectiveId && update.objectiveStatus) {
    const result = completeObjective(objectives, update.objectiveId, update.objectiveStatus)
    if (result.changed) {
      patch.objectiveList = result.objectives
      patch.objectives = result.objectives
      const obj = result.objectives.find(o => o.id === update.objectiveId)
      if (obj && update.objectiveStatus === 'completed') {
        events.push({ type: 'objective', message: `✅ Objetivo concluído: ${obj.label}` })
      }
    }
  }

  if (update.action === 'complete') {
    patch.status = 'completed'
    events.push({ type: 'completed', message: `✅ Missão concluída: ${quest.title}` })
  }
  if (update.action === 'fail') {
    patch.status = 'failed'
    events.push({ type: 'failed', message: `⚠️ Missão falhou: ${quest.title}` })
  }
  if (quest.status === 'inactive' && update.action === 'update') patch.status = 'active'

  const finalObjectives = patch.objectiveList ?? quest.objectiveList ?? quest.objectives
  if (finalObjectives.length > 0 && finalObjectives.every(objectiveDone)) {
    patch.status = 'completed'
  }

  return { patch, events }
}

export function unlockBranchQuest(update: QuestUpdate): QuestCreateDTO {
  const branch = getBranchQuest(update.branchKey, update.title)
  return {
    ...(branch ?? {
      title: update.title,
      description: update.description ?? null,
      status: 'active',
      questType: 'secondary',
      branchKey: update.branchKey ?? null,
      objectiveList: [],
    }),
    title: branch?.title ?? update.title,
    description: update.description ?? branch?.description ?? null,
    reward: update.reward ?? branch?.reward ?? null,
    branchKey: update.branchKey ?? branch?.branchKey ?? null,
    consequences: update.consequences ?? branch?.consequences ?? null,
  }
}

export function normalizeObjective(objective: QuestObjective): QuestObjective {
  const status = objective.status ?? (objective.done ? 'completed' : 'active')
  return {
    ...objective,
    status,
    done: status === 'completed',
    completedAt: objective.completedAt ?? null,
  }
}
