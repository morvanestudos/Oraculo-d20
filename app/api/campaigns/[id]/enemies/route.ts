import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'
import type { Enemy } from '../../../../../lib/types'

function mapEnemy(raw: any): Enemy {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    name: raw.name,
    description: raw.description ?? undefined,
    hp: raw.hp,
    maxHp: raw.maxHp,
    armorClass: raw.armorClass,
    initiative: raw.initiative,
    status: (raw.status as Enemy['status']) ?? 'alive',
    abilities: Array.isArray(raw.abilities) ? raw.abilities : (raw.abilities ? [] : undefined),
    loot: Array.isArray(raw.loot) ? raw.loot : (raw.loot ? [] : undefined),
    xpReward: raw.xpReward ?? 0,
    active: raw.active,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const enemies = await prisma.enemy.findMany({
    where: { campaignId, active: true },
    orderBy: { initiative: 'desc' },
  })
  return NextResponse.json(enemies.map(mapEnemy))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json() as { enemies: Partial<Enemy>[] }
  if (!body.enemies?.length) return NextResponse.json({ error: 'Lista de inimigos vazia' }, { status: 400 })

  const created = await Promise.all(
    body.enemies.map(e =>
      prisma.enemy.create({
        data: {
          campaignId,
          name: e.name ?? 'Inimigo',
          description: e.description ?? null,
          hp: e.hp ?? 10,
          maxHp: e.maxHp ?? e.hp ?? 10,
          armorClass: e.armorClass ?? 12,
          initiative: e.initiative ?? Math.floor(Math.random() * 20) + 1,
          status: 'alive',
          abilities: (e.abilities as any) ?? undefined,
          loot: (e.loot as any) ?? undefined,
          xpReward: e.xpReward ?? 0,
          active: true,
        },
      })
    )
  )

  const mapped = created.map(mapEnemy)

  await pusher.trigger(`campaign-${campaignId}`, 'enemies-updated', mapped).catch(() => {})

  return NextResponse.json(mapped)
}
