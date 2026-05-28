import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'
import type { MessageDTO, MessageCreateDTO } from '../../../../../lib/types'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ message: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const messages = await prisma.message.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' }
    })

    const messageDto: MessageDTO[] = messages.map(message => ({
      id: message.id.toString(),
      campaignId: message.campaignId.toString(),
      author: message.author,
      role: message.role as MessageDTO['role'],
      content: message.content,
      createdAt: message.createdAt.toISOString()
    }))

    return NextResponse.json(messageDto)
  } catch (error) {
    console.error(`Erro ao buscar mensagens da campanha ${params.id}:`, error)
    return NextResponse.json(
      { message: 'Erro ao buscar mensagens', error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const campaignId = Number(params.id)
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ message: 'ID de campanha inválido' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as MessageCreateDTO
    const { author, role, content } = body

    if (!author?.trim() || !role || !content?.trim()) {
      return NextResponse.json(
        { message: 'author, role e content são obrigatórios' },
        { status: 400 }
      )
    }

    const createdMessage = await prisma.message.create({
      data: {
        campaignId,
        author,
        role,
        content
      }
    })

    const messageDto: MessageDTO = {
      id: createdMessage.id.toString(),
      campaignId: createdMessage.campaignId.toString(),
      author: createdMessage.author,
      role: createdMessage.role as MessageDTO['role'],
      content: createdMessage.content,
      createdAt: createdMessage.createdAt.toISOString()
    }

    await pusher.trigger(`campaign-${campaignId}`, 'new-message', messageDto)

    return NextResponse.json(messageDto, { status: 201 })
  } catch (error) {
    console.error(`Erro ao criar mensagem para campanha ${params.id}:`, error)
    return NextResponse.json(
      { message: 'Erro ao criar mensagem', error: String(error) },
      { status: 500 }
    )
  }
}
