import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import type { QuestObjective } from '../../../../../../lib/types'

const TAVERNA_OBJECTIVES: QuestObjective[] = [
  { id: 'taverneiro',     label: 'Conversar com o taverneiro',   done: false },
  { id: 'desaparecimentos', label: 'Investigar os desaparecimentos', done: false },
  { id: 'floresta',       label: 'Explorar a floresta',          done: false },
  { id: 'culto',          label: 'Descobrir o culto oculto',     done: false },
  { id: 'criatura',       label: 'Encontrar a criatura final',   done: false },
]

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
        title: 'A Taverna dos Corvos',
        description: 'Uma série de desaparecimentos misteriosos assola a região. Investigue os rumores, adentre a floresta sombria e descubra o que se oculta nas sombras.',
        status: 'active',
        questType: 'main',
        objectives: TAVERNA_OBJECTIVES as any,
        reward: '500 XP + Título: Caçadores das Sombras',
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
