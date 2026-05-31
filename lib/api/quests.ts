import type { Quest, QuestCreateDTO, QuestPatchDTO, QuestUpdate, QuestObjective } from '../types'

export async function fetchQuests(campaignId: string): Promise<Quest[]> {
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/quests`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createQuest(campaignId: string, dto: QuestCreateDTO): Promise<Quest | null> {
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function patchQuest(questId: string, dto: QuestPatchDTO): Promise<Quest | null> {
  try {
    const res = await fetch(`/api/quests/${questId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Keyword patterns to auto-detect which main quest objective was completed
const OBJECTIVE_PATTERNS: Record<string, RegExp> = {
  taverneiro:      /taverneiro|taberneiro|conversei|falei com o tabern/i,
  desaparecimentos:/desapareci|sumiç|missing|investigu|investig/i,
  floresta:        /florest|mata|bosque|espessura|árvore|árvores/i,
  culto:           /culto|ritual|seita|oculto|símbolo|altar/i,
  criatura:        /criatura|monstro|besta|chefe|boss|final|dernei/i,
}

function applyObjectiveProgress(objectives: QuestObjective[], progressText: string): QuestObjective[] {
  const text = progressText.toLowerCase()
  let changed = false
  const updated = objectives.map(obj => {
    if (obj.done) return obj
    const pattern = OBJECTIVE_PATTERNS[obj.id]
    if (pattern && pattern.test(text)) {
      changed = true
      return { ...obj, done: true }
    }
    return obj
  })
  return changed ? updated : objectives
}

export async function processQuestUpdates(campaignId: string, updates: QuestUpdate[]): Promise<void> {
  for (const update of updates) {
    try {
      if (update.action === 'create') {
        await createQuest(campaignId, {
          title: update.title,
          description: update.description ?? null,
          reward: update.reward ?? null
        })
      } else {
        const quests = await fetchQuests(campaignId)
        const quest = quests.find(q =>
          (q.status === 'active' || q.status === 'inactive') &&
          (q.title.toLowerCase().includes(update.title.toLowerCase()) ||
            update.title.toLowerCase().includes(q.title.toLowerCase()))
        )
        if (!quest) continue

        const patchData: QuestPatchDTO = {}
        if (update.progress != null) patchData.progress = update.progress
        if (update.description != null) patchData.description = update.description
        if (update.action === 'complete') patchData.status = 'completed'
        if (update.action === 'fail') patchData.status = 'failed'

        // If quest was inactive, mark it active when first updated
        if (quest.status === 'inactive' && update.action === 'update') {
          patchData.status = 'active'
        }

        // Auto-check objectives from progress text for main quests
        if (quest.questType === 'main' && update.progress && quest.objectives.length > 0) {
          const updatedObjectives = applyObjectiveProgress(quest.objectives, update.progress)
          if (updatedObjectives !== quest.objectives) {
            patchData.objectives = updatedObjectives
          }
          // If all objectives done, auto-complete
          if (updatedObjectives.every(o => o.done)) {
            patchData.status = 'completed'
          }
        }

        await patchQuest(quest.id, patchData)
      }
    } catch (e) {
      console.error('Erro ao processar quest:', update.action, update.title, e)
    }
  }
}
