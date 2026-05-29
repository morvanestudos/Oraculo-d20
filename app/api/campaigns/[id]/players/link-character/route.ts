import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { playerId, characterId, characterName } = (await req.json()) as {
      playerId: string
      characterId: string
      characterName: string
    }

    if (!playerId?.trim() || !characterId?.trim()) {
      return NextResponse.json({ error: 'playerId e characterId são obrigatórios' }, { status: 400 })
    }

    const characterIdNum = Number(characterId)

    // Ensure character isn't already claimed by another player
    const taken = await prisma.campaignPlayer.findFirst({
      where: {
        campaignId,
        characterId: characterIdNum,
        NOT: { playerId },
      },
    })
    if (taken) {
      return NextResponse.json(
        { error: `${characterName} já está sendo usado por outro jogador.` },
        { status: 409 }
      )
    }

    const player = await prisma.campaignPlayer.update({
      where: { campaignId_playerId: { campaignId, playerId } },
      data: { characterId: characterIdNum, lastSeenAt: new Date() },
    })

    // System message
    const displayName = player.playerName
    await prisma.message.create({
      data: {
        campaignId,
        author: 'Sistema',
        role: 'system',
        content: `${displayName} entrou na aventura como ${characterName}.`,
      },
    })

    try {
      const { default: pusher } = await import('../../../../../../lib/pusher')
      await pusher.trigger(`campaign-${campaignId}`, 'character-linked', {
        playerId,
        characterId,
        characterName,
      })
    } catch {
      // Pusher opcional
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao vincular personagem:', error)
    return NextResponse.json({ error: 'Falha ao vincular personagem' }, { status: 500 })
  }
}
