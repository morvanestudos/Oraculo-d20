import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'
import type { Npc } from '../../../../../lib/types'

function mapNpc(raw: any): Npc {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    name: raw.name,
    role: raw.role ?? null,
    mood: raw.mood ?? 'neutro',
    trust: raw.trust ?? 0,
    fear: raw.fear ?? 0,
    knownInfo: raw.knownInfo ?? null,
    secrets: raw.secrets ?? null,
    lastInteraction: raw.lastInteraction ? new Date(raw.lastInteraction).toISOString() : null,
    active: raw.active,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const npcs = await prisma.npc.findMany({ where: { campaignId, active: true }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(npcs.map(mapNpc))
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json() as { npcs: Partial<Npc>[] }
  if (!body.npcs?.length) return NextResponse.json({ error: 'Lista vazia' }, { status: 400 })

  const created = await Promise.all(
    body.npcs.map(n =>
      prisma.npc.create({
        data: {
          campaignId,
          name: n.name ?? 'NPC',
          role: n.role ?? null,
          mood: n.mood ?? 'neutro',
          trust: n.trust ?? 0,
          fear: n.fear ?? 0,
          knownInfo: n.knownInfo ?? null,
          secrets: n.secrets ?? null,
          active: true,
        },
      })
    )
  )

  const mapped = created.map(mapNpc)
  await pusher.trigger(`campaign-${campaignId}`, 'npcs-updated', mapped).catch(() => {})
  return NextResponse.json(mapped)
}
