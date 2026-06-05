import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import { getOfficialCampaign } from '../../../../../lib/officialCampaigns'

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
    const campaign = existing
      ? null
      : await prisma.campaign.findUnique({ where: { id: campaignId } })
    const defaults = getOfficialCampaign(campaign?.title)?.initialMemory

    await prisma.campaignMemory.upsert({
      where: { campaignId },
      update: { storyFlags: { ...currentFlags, campaignStarted: true } },
      create: {
        campaignId,
        storyFlags: { ...(defaults?.storyFlags ?? {}), campaignStarted: true },
        currentScene: defaults?.currentScene ?? 'início da aventura',
        currentLocation: defaults?.currentLocation ?? 'campanha',
        currentObjective: defaults?.currentObjective ?? 'explorar e descobrir',
        currentThreat: defaults?.currentThreat ?? 'desconhecido',
        tensionLevel: defaults?.tensionLevel ?? 1,
        discoveredClues: defaults?.discoveredClues ?? [],
        activeNPCs: defaults?.activeNPCs ?? [],
        activeEnemies: defaults?.activeEnemies ?? [],
        turnCount: defaults?.turnCount ?? 0,
        lastPlayerAction: defaults?.lastPlayerAction ?? '',
        lastMasterAction: defaults?.lastMasterAction ?? '',
        summary: defaults?.summary ?? null,
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
