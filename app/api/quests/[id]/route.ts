import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import type { Quest, QuestPatchDTO } from '../../../../lib/types'

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const questId = Number(params.id)
  if (Number.isNaN(questId)) {
    return NextResponse.json({ error: 'ID de quest inválido' }, { status: 400 })
  }

  try {
    const body = (await req.json()) as QuestPatchDTO

    const updateData: any = {}
    if (body.title != null) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status != null) updateData.status = body.status
    if (body.progress !== undefined) updateData.progress = body.progress
    if (body.reward !== undefined) updateData.reward = body.reward

    const quest = await prisma.quest.update({
      where: { id: questId },
      data: updateData
    })

    const dto = mapQuest(quest)

    try {
      const { default: pusher } = await import('../../../../lib/pusher')
      await pusher.trigger(`campaign-${quest.campaignId}`, 'quest-updated', dto)
    } catch {
      // Pusher opcional
    }

    return NextResponse.json(dto)
  } catch (error) {
    console.error('Erro ao atualizar quest:', error)
    return NextResponse.json({ error: 'Falha ao atualizar quest' }, { status: 500 })
  }
}
