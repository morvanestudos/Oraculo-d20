import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { playerId } = (await req.json()) as { playerId: string }
    if (!playerId?.trim()) {
      return NextResponse.json({ error: 'playerId é obrigatório' }, { status: 400 })
    }

    await prisma.campaignPlayer.update({
      where: { campaignId_playerId: { campaignId, playerId } },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Player not found is silent — they may not have joined yet
    return NextResponse.json({ ok: false })
  }
}
