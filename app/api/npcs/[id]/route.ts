import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import pusher from '../../../../lib/pusher'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await req.json() as Partial<{
    mood: string; trust: number; fear: number
    knownInfo: string; secrets: string; active: boolean
  }>

  const data: Record<string, unknown> = { lastInteraction: new Date() }
  if (body.mood      !== undefined) data.mood      = body.mood
  if (body.trust     !== undefined) data.trust     = Math.max(-10, Math.min(10, body.trust))
  if (body.fear      !== undefined) data.fear      = Math.max(0, Math.min(10, body.fear))
  if (body.knownInfo !== undefined) data.knownInfo = body.knownInfo
  if (body.secrets   !== undefined) data.secrets   = body.secrets
  if (body.active    !== undefined) data.active    = body.active

  const updated = await prisma.npc.update({ where: { id }, data })

  const mapped = {
    id: String(updated.id),
    campaignId: String(updated.campaignId),
    name: updated.name,
    role: updated.role,
    mood: updated.mood,
    trust: updated.trust,
    fear: updated.fear,
    knownInfo: updated.knownInfo,
    lastInteraction: updated.lastInteraction?.toISOString() ?? null,
    active: updated.active,
  }

  await pusher.trigger(`campaign-${updated.campaignId}`, 'npcs-updated', [mapped]).catch(() => {})
  return NextResponse.json(mapped)
}
