import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const { code } = (await req.json()) as { code?: string }

    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: 'Código não informado.' }, { status: 400 })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { accessCode: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // No access code set — allow anyone
    if (!campaign.accessCode) {
      return NextResponse.json({ success: true })
    }

    if (code.trim().toUpperCase() === campaign.accessCode.trim().toUpperCase()) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Código incorreto. Fale com o mestre da mesa.' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Erro ao verificar código de acesso:', error)
    return NextResponse.json({ error: 'Falha ao verificar código' }, { status: 500 })
  }
}
