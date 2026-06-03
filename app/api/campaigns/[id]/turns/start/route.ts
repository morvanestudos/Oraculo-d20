import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma'
import pusher from '../../../../../../lib/pusher'
import type { TurnEntry } from '../../../../../../lib/types'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const since = new Date(Date.now() - 120_000)
  const players = await prisma.campaignPlayer.findMany({
    where: { campaignId, characterId: { not: null }, lastSeenAt: { gte: since } },
  })

  if (players.length === 0) {
    return NextResponse.json({ error: 'Nenhum jogador com personagem vinculado encontrado.' }, { status: 400 })
  }

  const charIds = players.map(p => p.characterId!).filter(Boolean)
  const characters = await prisma.character.findMany({ where: { id: { in: charIds } } })
  const charMap = new Map(characters.map(c => [c.id, c]))

  // Player entries
  const playerEntries: TurnEntry[] = players
    .reduce<TurnEntry[]>((acc, p) => {
      const char = charMap.get(p.characterId!)
      if (!char) return acc
      const dexMod = Math.floor(((char.dexterity ?? 10) - 10) / 2)
      const initiative = Math.floor(Math.random() * 20) + 1 + dexMod
      acc.push({
        type: 'player',
        playerId: p.playerId,
        playerName: p.playerName,
        characterId: char.id,
        characterName: char.name,
        initiative,
        hasActed: false,
      })
      return acc
    }, [])

  // Active enemy entries
  const enemies = await prisma.enemy.findMany({
    where: { campaignId, active: true, status: 'alive' },
  })
  const enemyEntries: TurnEntry[] = enemies.map(e => ({
    type: 'enemy' as const,
    enemyId: e.id,
    enemyName: e.name,
    initiative: e.initiative > 0 ? e.initiative : Math.floor(Math.random() * 20) + 1,
    hasActed: false,
  }))

  const turnOrder = [...playerEntries, ...enemyEntries]
    .sort((a, b) => b.initiative - a.initiative)

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

  const first = turnOrder[0]
  const firstLabel = first?.type === 'enemy' ? first.enemyName : first?.characterName ?? '—'
  await prisma.message.create({
    data: { campaignId, author: 'Sistema', role: 'system', content: `⚔️ Turnos iniciados. Rodada 1. Agora é a vez de ${firstLabel}.` },
  })

  await pusher.trigger(`campaign-${campaignId}`, 'turn-updated', mapped).catch(() => {})

  return NextResponse.json(mapped)
}
