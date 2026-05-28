import { NextResponse } from 'next/server'
import type { AIMasterRequest, AIMasterResponse } from '../../../../../lib/aiDungeonMaster'
import { generateAIMasterResponse, generateFallbackAIMasterResponse } from '../../../../../lib/aiDungeonMaster'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as AIMasterRequest

    if (!body.playerMessage || !body.campaign || !body.recentMessages) {
      return NextResponse.json({ error: 'playerMessage, campaign e recentMessages são obrigatórios' }, { status: 400 })
    }

    try {
      const aiResponse = await generateAIMasterResponse(body)
      return NextResponse.json(aiResponse)
    } catch (error) {
      console.error('OpenAI falhou, usando fallback local:', error)
      const fallback = await generateFallbackAIMasterResponse(body)
      return NextResponse.json(fallback)
    }
  } catch (error) {
    console.error('Erro no endpoint AI Master:', error)
    return NextResponse.json({ error: 'Falha ao processar a requisição de IA' }, { status: 500 })
  }
}
