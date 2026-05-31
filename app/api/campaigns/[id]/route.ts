import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import type { CampaignDTO } from '../../../../lib/types'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = Number(params.id)

    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { message: 'ID de campanha inválido' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      return NextResponse.json(
        { message: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    const campaignDto: CampaignDTO = {
      id: campaign.id.toString(),
      title: campaign.title ?? '',
      description: campaign.description ?? '',
      theme: campaign.theme ?? null,
      level: campaign.level ?? null,
      maxPlayers: campaign.maxPlayers ?? null,
      createdAt: campaign.createdAt.toISOString(),
      players: [],
      hasAccessCode: campaign.accessCode != null && campaign.accessCode.trim() !== '',
    }

    console.log(`GET /api/campaigns/${params.id}: campanha carregada`)
    return NextResponse.json(campaignDto)
  } catch (error) {
    console.error(`Erro ao carregar campanha ${params.id} do banco:`, error)
    return NextResponse.json(
      { message: 'Erro ao carregar campanha', error: String(error) },
      { status: 500 }
    )
  }
}
