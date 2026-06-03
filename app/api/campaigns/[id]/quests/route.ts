import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import type { Quest, QuestCreateDTO } from '../../../../../lib/types'
import { normalizeQuestTitle } from '../../../../../lib/questSystem'

function mapQuest(raw: any): Quest {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    title: raw.title,
    description: raw.description ?? null,
    status: (raw.status ?? 'active') as Quest['status'],
    progress: raw.progress ?? null,
    reward: raw.reward ?? null,
    questType: (raw.questType ?? 'secondary') as Quest['questType'],
    objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
    branchKey: raw.branchKey ?? null,
    parentQuestId: raw.parentQuestId != null ? String(raw.parentQuestId) : null,
    objectiveList: Array.isArray(raw.objectiveList) ? raw.objectiveList : null,
    consequences: Array.isArray(raw.consequences) ? raw.consequences : null,
    hidden: raw.hidden ?? false,
    priority: raw.priority ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt)
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const quests = await prisma.quest.findMany({
      where: { campaignId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ]
    })
    const statusRank: Record<string, number> = { active: 0, inactive: 1, completed: 2, failed: 3 }
    const sorted = quests
      .map(mapQuest)
      .sort((a, b) =>
        (b.priority ?? 0) - (a.priority ?? 0)
        || (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)
        || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Erro ao buscar quests:', error)
    return NextResponse.json({ error: 'Falha ao buscar quests' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const body = (await req.json()) as QuestCreateDTO
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.quest.findMany({ where: { campaignId } })
    const duplicate = existing.find(q => normalizeQuestTitle(q.title) === normalizeQuestTitle(body.title))
    if (duplicate) return NextResponse.json(mapQuest(duplicate))

    const quest = await prisma.quest.create({
      data: {
        campaignId,
        title: body.title.trim(),
        description: body.description ?? null,
        reward: body.reward ?? null,
        status: body.status ?? 'active',
        questType: body.questType ?? 'secondary',
        objectives: (body.objectives ?? []) as any,
        branchKey: body.branchKey ?? null,
        parentQuestId: body.parentQuestId != null ? Number(body.parentQuestId) : null,
        objectiveList: body.objectiveList !== undefined ? body.objectiveList as any : undefined,
        consequences: body.consequences !== undefined ? body.consequences as any : undefined,
        hidden: body.hidden ?? false,
        priority: body.priority ?? 0,
      }
    })

    const dto = mapQuest(quest)

    try {
      const { default: pusher } = await import('../../../../../lib/pusher')
      await pusher.trigger(`campaign-${campaignId}`, 'quest-updated', dto)
    } catch {
      // Pusher opcional
    }

    return NextResponse.json(dto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar quest:', error)
    return NextResponse.json({ error: 'Falha ao criar quest' }, { status: 500 })
  }
}
