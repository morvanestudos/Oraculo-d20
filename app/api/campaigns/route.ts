import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import type { CampaignDTO, CampaignCreateDTO } from '../../../lib/types'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const campaignDto: CampaignDTO[] = campaigns.map(campaign => ({
      id: campaign.id.toString(),
      title: campaign.title ?? '',
      description: campaign.description ?? '',
      theme: campaign.theme ?? null,
      level: campaign.level ?? null,
      maxPlayers: campaign.maxPlayers ?? null,
      createdAt: campaign.createdAt.toISOString(),
      players: []
    }))

    console.log('GET /api/campaigns: carregadas', campaignDto.length, 'campanhas')
    return NextResponse.json(campaignDto)
  } catch (error) {
    console.error('Erro ao buscar campanhas do banco:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar campanhas', error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CampaignCreateDTO
    const { title, description, theme, level, maxPlayers } = body

    if (!title?.trim() || !description?.trim() || !theme?.trim()) {
      return NextResponse.json(
        { message: 'title, description e theme são obrigatórios' },
        { status: 400 }
      )
    }

    const createdCampaign = await prisma.campaign.create({
      data: {
        title,
        description,
        theme,
        level,
        maxPlayers
      }
    })

    const campaignDto: CampaignDTO = {
      id: createdCampaign.id.toString(),
      title: createdCampaign.title ?? '',
      description: createdCampaign.description ?? '',
      theme: createdCampaign.theme ?? null,
      level: createdCampaign.level ?? null,
      maxPlayers: createdCampaign.maxPlayers ?? null,
      createdAt: createdCampaign.createdAt.toISOString(),
      players: []
    }

    console.log('POST /api/campaigns: campanha criada', campaignDto.id)
    return NextResponse.json(campaignDto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar campanha no banco:', error)
    return NextResponse.json(
      { message: 'Erro ao criar campanha', error: String(error) },
      { status: 500 }
    )
  }
}
