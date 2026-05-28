import type { Quest, QuestCreateDTO, QuestPatchDTO, QuestUpdate } from '../types'

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
          q.status === 'active' &&
          (q.title.toLowerCase().includes(update.title.toLowerCase()) ||
            update.title.toLowerCase().includes(q.title.toLowerCase()))
        )
        if (!quest) continue

        const patchData: QuestPatchDTO = {}
        if (update.progress != null) patchData.progress = update.progress
        if (update.description != null) patchData.description = update.description
        if (update.action === 'complete') patchData.status = 'completed'
        if (update.action === 'fail') patchData.status = 'failed'

        await patchQuest(quest.id, patchData)
      }
    } catch (e) {
      console.error('Erro ao processar quest:', update.action, update.title, e)
    }
  }
}
