import { NextResponse } from 'next/server'
import { generateRollResolutionNarration, type RollResolutionContext } from '../../../../../lib/aiDungeonMaster'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const body = await request.json() as { rollResolution?: RollResolutionContext }
    const rollResolution = body.rollResolution

    if (!rollResolution?.rollType || !rollResolution.actorName || typeof rollResolution.total !== 'number') {
      return NextResponse.json({ error: 'rollResolution inválido' }, { status: 400 })
    }

    const narration = await generateRollResolutionNarration(rollResolution)
    return NextResponse.json({ narration })
  } catch (error) {
    console.error('Erro ao narrar resolução de rolagem:', error)
    return NextResponse.json({ error: 'Falha ao narrar resolução de rolagem' }, { status: 500 })
  }
}
