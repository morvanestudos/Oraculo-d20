import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import pusher from '../../../../../../lib/pusher'
import type { TurnEntry } from '../../../../../../lib/types'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const state = await prisma.campaignTurnState.findUnique({ where: { campaignId } })
  if (!state || !state.active) return NextResponse.json({ error: 'Nenhum turno ativo.' }, { status: 400 })

  let turnOrder = (Array.isArray(state.turnOrder) ? state.turnOrder : []) as TurnEntry[]
  let { round, currentTurnIndex } = state

  // Mark current actor as hasActed
  if (turnOrder[currentTurnIndex]) {
    turnOrder[currentTurnIndex] = { ...turnOrder[currentTurnIndex], hasActed: true }
  }

  // Advance index
  const nextIndex = currentTurnIndex + 1

  let sysMsg: string
  if (nextIndex >= turnOrder.length) {
    // All acted — start new round
    round += 1
    currentTurnIndex = 0
    turnOrder = turnOrder.map(e => ({ ...e, hasActed: false }))
    const first = turnOrder[0]
    sysMsg = `🔁 Rodada ${round} começou. Agora é a vez de ${first?.characterName ?? '—'}.`
  } else {
    currentTurnIndex = nextIndex
    const next = turnOrder[currentTurnIndex]
    sysMsg = `⏭️ Turno encerrado. Agora é a vez de ${next?.characterName ?? '—'}.`
  }

  const updated = await prisma.campaignTurnState.update({
    where: { campaignId },
    data: { round, currentTurnIndex, turnOrder },
  })

  const mapped = {
    id: String(updated.id),
    campaignId: String(updated.campaignId),
    active: updated.active,
    round: updated.round,
    currentTurnIndex: updated.currentTurnIndex,
    turnOrder: updated.turnOrder as TurnEntry[],
    updatedAt: updated.updatedAt.toISOString(),
  }

  await prisma.message.create({
    data: { campaignId, author: 'Sistema', role: 'system', content: sysMsg },
  })

  await pusher.trigger(`campaign-${campaignId}`, 'turn-updated', mapped).catch(() => {})

  return NextResponse.json(mapped)
}
