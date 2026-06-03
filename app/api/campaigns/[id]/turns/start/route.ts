import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import pusher from '../../../../../../lib/pusher'
import type { TurnEntry } from '../../../../../../lib/types'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  // Fetch all online players with a linked character (seen in last 120s)
  const since = new Date(Date.now() - 120_000)
  const players = await prisma.campaignPlayer.findMany({
    where: { campaignId, characterId: { not: null }, lastSeenAt: { gte: since } },
  })

  if (players.length === 0) {
    return NextResponse.json({ error: 'Nenhum jogador com personagem vinculado encontrado.' }, { status: 400 })
  }

  // Fetch character dexterity for initiative calculation
  const charIds = players.map(p => p.characterId!).filter(Boolean)
  const characters = await prisma.character.findMany({ where: { id: { in: charIds } } })
  const charMap = new Map(characters.map(c => [c.id, c]))

  const turnOrder: TurnEntry[] = players
    .reduce<TurnEntry[]>((acc, p) => {
      const char = charMap.get(p.characterId!)
      if (!char) return acc
      const dexMod = Math.floor(((char.dexterity ?? 10) - 10) / 2)
      const initiative = Math.floor(Math.random() * 20) + 1 + dexMod
      acc.push({ playerId: p.playerId, playerName: p.playerName, characterId: char.id, characterName: char.name, initiative, hasActed: false })
      return acc
    }, [])
    .sort((a, b) => b.initiative - a.initiative)

  // Upsert turn state
  const state = await prisma.campaignTurnState.upsert({
    where: { campaignId },
    create: { campaignId, active: true, round: 1, currentTurnIndex: 0, turnOrder },
    update: { active: true, round: 1, currentTurnIndex: 0, turnOrder },
  })

  const mapped = {
    id: String(state.id),
    campaignId: String(state.campaignId),
    active: state.active,
    round: state.round,
    currentTurnIndex: state.currentTurnIndex,
    turnOrder: state.turnOrder as TurnEntry[],
    updatedAt: state.updatedAt.toISOString(),
  }

  // System message + Pusher
  const first = turnOrder[0]
  await prisma.message.create({
    data: { campaignId, author: 'Sistema', role: 'system', content: `⚔️ Turnos iniciados. Rodada 1. Agora é a vez de ${first?.characterName ?? 'aguardar'}.` },
  })

  await pusher.trigger(`campaign-${campaignId}`, 'turn-updated', mapped).catch(() => {})

  return NextResponse.json(mapped)
}
