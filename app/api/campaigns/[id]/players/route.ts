import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import type { CampaignPlayer } from '../../../../../lib/types'

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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    // Consider online: lastSeenAt within last 60 seconds
    const since = new Date(Date.now() - 60_000)
    const players = await prisma.campaignPlayer.findMany({
      where: { campaignId, lastSeenAt: { gte: since } },
      orderBy: { joinedAt: 'asc' },
    })
    return NextResponse.json(players.map(mapPlayer))
  } catch (error) {
    console.error('Erro ao buscar jogadores:', error)
    return NextResponse.json({ error: 'Falha ao buscar jogadores' }, { status: 500 })
  }
}
