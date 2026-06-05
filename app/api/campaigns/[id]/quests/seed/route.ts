import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import { getOfficialCampaign } from '../../../../../../lib/officialCampaigns'

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

    const officialCampaign = getOfficialCampaign(campaign.title)
    if (!officialCampaign) {
      return NextResponse.json({ seeded: false, reason: 'not_official_campaign' })
    }

    // Check if main quest already exists
    const existing = await prisma.quest.findFirst({
      where: { campaignId, questType: 'main' }
    })

    if (existing) {
      return NextResponse.json({ seeded: false, reason: 'already_exists', questId: String(existing.id) })
    }

    const mainQuest = officialCampaign.mainQuest

    const quest = await prisma.quest.create({
      data: {
        campaignId,
        title: mainQuest.title,
        description: mainQuest.description,
        status: mainQuest.status ?? 'active',
        questType: mainQuest.questType ?? 'main',
        objectives: (mainQuest.objectives ?? []) as any,
        objectiveList: (mainQuest.objectiveList ?? []) as any,
        reward: mainQuest.reward,
        priority: mainQuest.priority ?? 100,
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
