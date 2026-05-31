import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import type { CampaignPlayer, CampaignPlayerJoinDTO } from '../../../../../../lib/types'

function mapPlayer(raw: any): CampaignPlayer {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    playerId: raw.playerId,
    playerName: raw.playerName,
    characterId: raw.characterId != null ? String(raw.characterId) : null,
    joinedAt: raw.joinedAt instanceof Date ? raw.joinedAt.toISOString() : String(raw.joinedAt),
    lastSeenAt: raw.lastSeenAt instanceof Date ? raw.lastSeenAt.toISOString() : String(raw.lastSeenAt),
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  let body: CampaignPlayerJoinDTO
  try {
    body = (await req.json()) as CampaignPlayerJoinDTO
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { playerId, playerName } = body

  if (!playerId?.trim() || !playerName?.trim()) {
    return NextResponse.json({ error: 'playerId e playerName são obrigatórios' }, { status: 400 })
  }

  console.log('JOIN PLAYER:', { campaignId, playerId, playerName })

  try {
    // findFirst é mais robusto que upsert quando a unique constraint pode não estar garantida no DB
    const existing = await prisma.campaignPlayer.findFirst({
      where: { campaignId, playerId },
    })

    let player
    let isNew = false

    if (existing) {
      player = await prisma.campaignPlayer.update({
        where: { id: existing.id },
        data: { playerName: playerName.trim(), lastSeenAt: new Date() },
      })
    } else {
      player = await prisma.campaignPlayer.create({
        data: { campaignId, playerId, playerName: playerName.trim() },
      })
      isNew = true
    }

    const dto = mapPlayer(player)
    console.log('PLAYER SAVED:', dto)

    // System message only on first join
    if (isNew) {
      await prisma.message.create({
        data: {
          campaignId,
          author: 'Sistema',
          role: 'system',
          content: `${playerName.trim()} entrou na mesa.`,
        },
      })
    }

    try {
      const { default: pusher } = await import('../../../../../../lib/pusher')
      await pusher.trigger(`campaign-${campaignId}`, 'player-joined', dto)
    } catch {
      // Pusher opcional
    }

    return NextResponse.json(dto, { status: isNew ? 201 : 200 })
  } catch (error) {
    console.error('Erro ao registrar jogador:', error)
    return NextResponse.json({ error: 'Falha ao entrar na campanha' }, { status: 500 })
  }
}
