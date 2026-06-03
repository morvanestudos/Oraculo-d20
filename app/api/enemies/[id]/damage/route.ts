import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json() as { hpChange: number; reason?: string }
  if (typeof body.hpChange !== 'number') return NextResponse.json({ error: 'hpChange obrigatório' }, { status: 400 })

  const enemy = await prisma.enemy.findUnique({ where: { id } })
  if (!enemy) return NextResponse.json({ error: 'Inimigo não encontrado' }, { status: 404 })

  const newHp = Math.max(0, Math.min(enemy.maxHp, enemy.hp + body.hpChange))
  const dying = newHp === 0

  const updated = await prisma.enemy.update({
    where: { id },
    data: {
      hp: newHp,
      status: dying ? 'dead' : 'alive',
      active: dying ? false : true,
    },
  })

  const mapped = {
    id: String(updated.id),
    campaignId: String(updated.campaignId),
    name: updated.name,
    hp: updated.hp,
    maxHp: updated.maxHp,
    armorClass: updated.armorClass,
    status: updated.status,
    active: updated.active,
    xpReward: updated.xpReward,
    loot: updated.loot,
  }

  await pusher.trigger(`campaign-${updated.campaignId}`, 'enemies-updated', [mapped]).catch(() => {})

  return NextResponse.json(mapped)
}
