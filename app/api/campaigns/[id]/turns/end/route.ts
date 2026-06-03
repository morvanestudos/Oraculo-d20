import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import pusher from '../../../../../../lib/pusher'
import type { TurnEntry } from '../../../../../../lib/types'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const state = await prisma.campaignTurnState.upsert({
    where: { campaignId },
    create: { campaignId, active: false, round: 1, currentTurnIndex: 0, turnOrder: [] },
    update: { active: false },
  })

  const mapped = {
    id: String(state.id),
    campaignId: String(state.campaignId),
    active: false,
    round: state.round,
    currentTurnIndex: state.currentTurnIndex,
    turnOrder: (Array.isArray(state.turnOrder) ? state.turnOrder : []) as TurnEntry[],
    updatedAt: state.updatedAt.toISOString(),
  }

  await prisma.message.create({
    data: { campaignId, author: 'Sistema', role: 'system', content: '🕊️ Modo de turnos encerrado. Modo Exploração ativado.' },
  })

  await pusher.trigger(`campaign-${campaignId}`, 'turn-updated', mapped).catch(() => {})

  return NextResponse.json(mapped)
}
