import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import { TAVERNA_MAIN_QUEST } from '../../../../../../lib/questSystem'

function isTaverna(title: string) {
  return title.toLowerCase().includes('taverna dos corvos')
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (!isTaverna(campaign.title ?? '')) {
      return NextResponse.json({ seeded: false, reason: 'not_taverna' })
    }

    // Check if main quest already exists
    const existing = await prisma.quest.findFirst({
      where: { campaignId, questType: 'main' }
    })

    if (existing) {
      return NextResponse.json({ seeded: false, reason: 'already_exists', questId: String(existing.id) })
    }

    const quest = await prisma.quest.create({
      data: {
        campaignId,
        title: TAVERNA_MAIN_QUEST.title,
        description: TAVERNA_MAIN_QUEST.description,
        status: TAVERNA_MAIN_QUEST.status ?? 'active',
        questType: TAVERNA_MAIN_QUEST.questType ?? 'main',
        objectives: (TAVERNA_MAIN_QUEST.objectives ?? []) as any,
        objectiveList: (TAVERNA_MAIN_QUEST.objectiveList ?? []) as any,
        reward: TAVERNA_MAIN_QUEST.reward,
        priority: TAVERNA_MAIN_QUEST.priority ?? 100,
      }
    })

    try {
      const { default: pusher } = await import('../../../../../../lib/pusher')
      await pusher.trigger(`campaign-${campaignId}`, 'quest-updated', {})
    } catch { /* Pusher opcional */ }

    return NextResponse.json({ seeded: true, questId: String(quest.id) }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar quest seed:', error)
    return NextResponse.json({ error: 'Falha ao criar quest principal' }, { status: 500 })
  }
}
