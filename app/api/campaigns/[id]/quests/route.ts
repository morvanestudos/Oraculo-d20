import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import type { Quest, QuestCreateDTO } from '../../../../../lib/types'

function mapQuest(raw: any): Quest {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    title: raw.title,
    description: raw.description ?? null,
    status: raw.status as Quest['status'],
    progress: raw.progress ?? null,
    reward: raw.reward ?? null,
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
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(quests.map(mapQuest))
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

    const quest = await prisma.quest.create({
      data: {
        campaignId,
        title: body.title.trim(),
        description: body.description ?? null,
        reward: body.reward ?? null,
        status: 'active'
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
