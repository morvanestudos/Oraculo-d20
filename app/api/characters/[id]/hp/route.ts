import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await request.json() as { hpChange: number; reason?: string; campaignId?: number }
  if (typeof body.hpChange !== 'number') {
    return NextResponse.json({ error: 'hpChange é obrigatório' }, { status: 400 })
  }

  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 })

  const currentHp = character.hp ?? 0
  // Use a very large number as maxHp if not set — character creator sets hp = maxHp at creation
  const maxHp = character.hp != null ? Math.max(character.hp, currentHp) : currentHp
  const newHp = Math.max(0, Math.min(maxHp, currentHp + body.hpChange))

  const updated = await prisma.character.update({
    where: { id },
    data: { hp: newHp },
  })

  const mapped = {
    id: String(updated.id),
    hp: updated.hp ?? 0,
    maxHp,
    name: updated.name,
    campaignId: updated.campaignId ? String(updated.campaignId) : null,
  }

  // Broadcast HP update via Pusher so all players see it
  const campaignId = body.campaignId ?? updated.campaignId
  if (campaignId) {
    await pusher.trigger(`campaign-${campaignId}`, 'character-updated', {
      characterId: String(id),
      hp: newHp,
      maxHp,
    }).catch(() => {})
  }

  return NextResponse.json(mapped)
}
