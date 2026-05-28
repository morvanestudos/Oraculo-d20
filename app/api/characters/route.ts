import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import pusher from '../../../lib/pusher'
import type { CharacterCreateDTO } from '../../../lib/types'

function parseInventory(raw: string | null): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map(String)
    }
  } catch {
    // fallback
  }

  return raw.split(',').map(item => item.trim()).filter(Boolean)
}

function mapCharacter(record: any) {
  return {
    id: String(record.id),
    name: record.name,
    race: record.race,
    className: record.class,
    level: record.level ?? 1,
    hp: record.hp ?? 0,
    ac: record.armorClass ?? 0,
    attributes: {
      str: record.strength ?? 10,
      dex: record.dexterity ?? 10,
      con: record.constitution ?? 10,
      int: record.intelligence ?? 10,
      wis: record.wisdom ?? 10,
      cha: record.charisma ?? 10
    },
    inventory: parseInventory(record.inventory),
    story: record.backstory ?? '',
    campaignId: record.campaignId,
    createdAt: record.createdAt?.toISOString() ?? new Date().toISOString()
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const campaignId = url.searchParams.get('campaignId')
  const parsedCampaignId = campaignId ? Number(campaignId) : undefined

  const characters = await prisma.character.findMany({
    where: parsedCampaignId ? { campaignId: parsedCampaignId } : undefined,
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(characters.map(mapCharacter))
}

export async function POST(request: Request) {
  const body: CharacterCreateDTO = await request.json()

  if (!body.name || !body.race) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const campaignIdValue = body.campaignId ? Number(body.campaignId) : undefined

  const newCharacter = await prisma.character.create({
    data: {
      name: body.name,
      race: body.race,
      class: body.class ?? '',
      level: body.level ?? 1,
      hp: body.hp ?? 0,
      armorClass: body.armorClass ?? 0,
      strength: body.strength ?? 10,
      dexterity: body.dexterity ?? 10,
      constitution: body.constitution ?? 10,
      intelligence: body.intelligence ?? 10,
      wisdom: body.wisdom ?? 10,
      charisma: body.charisma ?? 10,
      inventory: JSON.stringify(body.inventory ?? []),
      backstory: body.backstory ?? '',
      campaignId: typeof campaignIdValue === 'number' && !Number.isNaN(campaignIdValue) ? campaignIdValue : undefined
    }
  })

  const mapped = mapCharacter(newCharacter)

  if (newCharacter.campaignId) {
    try {
      await pusher.trigger(`campaign-${newCharacter.campaignId}`, 'character-created', mapped)
    } catch (error) {
      console.error('Pusher trigger failed for character-created:', error)
    }
  }

  return NextResponse.json(mapped)
}
