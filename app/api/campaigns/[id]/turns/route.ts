import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import type { TurnEntry } from '../../../../../lib/types'

function mapTurn(raw: any) {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    active: raw.active,
    round: raw.round,
    currentTurnIndex: raw.currentTurnIndex,
    turnOrder: (Array.isArray(raw.turnOrder) ? raw.turnOrder : []) as TurnEntry[],
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt ?? ''),
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const state = await prisma.campaignTurnState.findUnique({ where: { campaignId } })
  if (!state) return NextResponse.json({ active: false, round: 1, currentTurnIndex: 0, turnOrder: [] })

  return NextResponse.json(mapTurn(state))
}
