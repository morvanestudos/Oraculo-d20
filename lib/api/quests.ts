import type { Quest, QuestCreateDTO, QuestPatchDTO, QuestUpdate, QuestObjective } from '../types'
import {
  applyQuestUpdate,
  findQuestByTitle,
  getBranchQuest,
  preventDuplicateQuest,
  type QuestFeedbackEvent,
  unlockBranchQuest,
} from '../questSystem'

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
  talk_arvik:      /arvik|taverneiro|taberneiro/i,
  talk_elenna:     /elenna|viúva|viuva/i,
  inspect_back_door: /porta dos fundos|porta|símbolo|simbolo/i,
  find_forest_tracks: /rastro|pegada|lama|floresta/i,
  discover_abductor: /levando|sequest|culto|responsável|responsavel|desaparec/i,
}

function applyObjectiveProgress(objectives: QuestObjective[], progressText: string): QuestObjective[] {
  const text = progressText.toLowerCase()
  let changed = false
  const updated = objectives.map(obj => {
    if (obj.done) return obj
    const pattern = OBJECTIVE_PATTERNS[obj.id]
    if (pattern && pattern.test(text)) {
      changed = true
      return { ...obj, status: 'completed' as const, done: true, completedAt: new Date().toISOString() }
    }
    return obj
  })
  return changed ? updated : objectives
}

async function applyQuestConsequences(campaignId: string, update: QuestUpdate): Promise<QuestFeedbackEvent[]> {
  const events: QuestFeedbackEvent[] = []
  const consequences = update.consequences ?? []
  if (consequences.length === 0) return events

  for (const consequence of consequences) {
    try {
      if ((consequence.type === 'npc_trust' || consequence.type === 'npc_fear') && consequence.npcName && typeof consequence.value === 'number') {
        const npcs: Array<{ id: string; name: string; trust: number; fear: number }> =
          await fetch(`/api/campaigns/${campaignId}/npcs`).then(r => r.ok ? r.json() : []).catch(() => [])
        const target = consequence.npcName.toLowerCase()
        const npc = npcs.find(n => n.name.toLowerCase() === target)
          ?? npcs.find(n => n.name.toLowerCase().includes(target) || target.includes(n.name.split(',')[0].toLowerCase()))
        if (!npc) continue

        const patch = consequence.type === 'npc_trust'
          ? { trust: Math.max(-10, Math.min(10, npc.trust + consequence.value)) }
          : { fear: Math.max(0, Math.min(10, npc.fear + consequence.value)) }

        await fetch(`/api/npcs/${npc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => {})

        events.push({ type: 'consequence', message: `⚠️ Consequência: ${npc.name} reage às escolhas do grupo.` })
      } else if (consequence.type === 'unlock_quest' && consequence.questTitle) {
        events.push({ type: 'consequence', message: `📜 Ramo possível: ${consequence.questTitle}` })
      } else if (consequence.type === 'memory_flag' && consequence.flag) {
        events.push({ type: 'consequence', message: `⚠️ Consequência registrada: ${consequence.flag}` })
      }
    } catch {
      // Consequences are best-effort and must not block quest updates.
    }
  }

  return events
}

export async function processQuestUpdates(campaignId: string, updates: QuestUpdate[]): Promise<QuestFeedbackEvent[]> {
  const events: QuestFeedbackEvent[] = []

  for (const update of updates) {
    try {
      const quests = await fetchQuests(campaignId)

      if (update.action === 'create' || update.action === 'unlock_branch') {
        const dto: QuestCreateDTO = update.action === 'unlock_branch'
          ? unlockBranchQuest(update)
          : {
              title: update.title,
              description: update.description ?? null,
              reward: update.reward ?? null,
              branchKey: update.branchKey ?? null,
              consequences: update.consequences ?? null,
            }

        if (!preventDuplicateQuest(quests, dto)) continue
        const created = await createQuest(campaignId, dto)
        if (created) {
          const branch = getBranchQuest(created.branchKey, created.title)
          events.push({ type: 'created', message: `📜 Nova missão: ${branch?.title ?? created.title}` })
        }
        events.push(...await applyQuestConsequences(campaignId, update))
      } else {
        const quest = findQuestByTitle(quests, update.title)
        if (!quest) continue

        const { patch: patchData, events: patchEvents } = applyQuestUpdate(quest, update)

        // Legacy fallback: auto-check objectives from progress text for older AI responses.
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

        if (Object.keys(patchData).length > 0) await patchQuest(quest.id, patchData)
        events.push(...patchEvents)
        events.push(...await applyQuestConsequences(campaignId, update))
      }
    } catch (e) {
      console.error('Erro ao processar quest:', update.action, update.title, e)
    }
  }

  return events
}
