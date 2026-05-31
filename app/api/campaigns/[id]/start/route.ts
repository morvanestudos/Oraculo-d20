import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { initialMessage } = (await req.json()) as { initialMessage?: string }

    const content = initialMessage?.trim() ||
      'A aventura começa. O Mestre aguarda a primeira ação dos aventureiros.'

    // Create initial master message
    const message = await prisma.message.create({
      data: {
        campaignId,
        author: 'Mestre IA',
        role: 'master',
        content,
      },
    })

    const messageDto = {
      id: String(message.id),
      campaignId: String(message.campaignId),
      author: message.author,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }

    // Mark campaignStarted in storyFlags
    const existing = await prisma.campaignMemory.findUnique({ where: { campaignId } })
    const currentFlags = (existing?.storyFlags as Record<string, unknown>) ?? {}

    await prisma.campaignMemory.upsert({
      where: { campaignId },
      update: { storyFlags: { ...currentFlags, campaignStarted: true } },
      create: {
        campaignId,
        storyFlags: { campaignStarted: true },
        currentScene: 'início da aventura',
        currentLocation: 'campanha',
        currentObjective: 'explorar e descobrir',
        currentThreat: 'desconhecido',
        tensionLevel: 1,
      },
    })

    try {
      const { default: pusher } = await import('../../../../../lib/pusher')
      // Broadcast message so ChatBoxes load it
      await pusher.trigger(`campaign-${campaignId}`, 'new-message', messageDto)
      // Broadcast campaign-started so all waiting rooms close
      await pusher.trigger(`campaign-${campaignId}`, 'campaign-started', { campaignId })
    } catch { /* Pusher opcional */ }

    return NextResponse.json({ ok: true, message: messageDto })
  } catch (error) {
    console.error('Erro ao iniciar campanha:', error)
    return NextResponse.json({ error: 'Falha ao iniciar campanha' }, { status: 500 })
  }
}
