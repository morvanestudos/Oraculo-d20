import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import type { CampaignPlayer } from '../../../../../../lib/types'

function mapPlayer(raw: any): CampaignPlayer {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    playerId: raw.playerId,
    playerName: raw.playerName,
    characterId: raw.characterId != null ? String(raw.characterId) : null,
    ready: raw.ready ?? false,
    joinedAt: raw.joinedAt instanceof Date ? raw.joinedAt.toISOString() : String(raw.joinedAt),
    lastSeenAt: raw.lastSeenAt instanceof Date ? raw.lastSeenAt.toISOString() : String(raw.lastSeenAt),
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { playerId, ready } = (await req.json()) as { playerId: string; ready: boolean }

    if (!playerId?.trim() || typeof ready !== 'boolean') {
      return NextResponse.json({ error: 'playerId e ready são obrigatórios' }, { status: 400 })
    }

    const existing = await prisma.campaignPlayer.findFirst({ where: { campaignId, playerId } })
    if (!existing) {
      return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
    }

    const player = await prisma.campaignPlayer.update({
      where: { id: existing.id },
      data: { ready, lastSeenAt: new Date() },
    })

    const dto = mapPlayer(player)

    try {
      const { default: pusher } = await import('../../../../../../lib/pusher')
      await pusher.trigger(`campaign-${campaignId}`, 'player-updated', dto)
    } catch { /* Pusher opcional */ }

    return NextResponse.json(dto)
  } catch (error) {
    console.error('Erro ao atualizar status pronto:', error)
    return NextResponse.json({ error: 'Falha ao atualizar status' }, { status: 500 })
  }
}
