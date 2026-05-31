import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import { generatePrologue } from '../../../../../lib/aiPrologue'
import type { Campaign, Character, CampaignMemory } from '../../../../../lib/types'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { characterId, character, campaign, campaignMemory } = (await req.json()) as {
      characterId?: string
      character: Character
      campaign: Campaign
      campaignMemory?: CampaignMemory | null
    }

    if (!character?.name) {
      return NextResponse.json({ error: 'character é obrigatório' }, { status: 400 })
    }

    const prologue = await generatePrologue(campaign, character, campaignMemory)

    // Save prologue to Character in DB (fire-and-forget, non-fatal)
    if (characterId) {
      const charIdNum = Number(characterId)
      if (!Number.isNaN(charIdNum)) {
        prisma.character.update({
          where: { id: charIdNum },
          data: { prologue },
        }).catch(err => console.error('Falha ao salvar prólogo no personagem:', err))
      }
    }

    return NextResponse.json({ prologue })
  } catch (error) {
    console.error('Erro ao gerar prólogo:', error)
    return NextResponse.json({ error: 'Falha ao gerar prólogo' }, { status: 500 })
  }
}
