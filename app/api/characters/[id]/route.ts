import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import pusher from '../../../../lib/pusher'
import type { CharacterPatchDTO } from '../../../../lib/types'

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
    prologue: record.prologue ?? null,
    xp: record.xp ?? 0,
    nextLevelXp: record.nextLevelXp ?? 100,
    campaignId: record.campaignId,
    createdAt: record.createdAt?.toISOString() ?? new Date().toISOString()
  }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid character id' }, { status: 400 })
  }

  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  return NextResponse.json(mapCharacter(character))
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid character id' }, { status: 400 })
  }

  const body = (await request.json()) as CharacterPatchDTO
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.race !== undefined) data.race = body.race
  if (body.class !== undefined) data.class = body.class
  if (body.level !== undefined) data.level = body.level
  if (body.hp !== undefined) data.hp = body.hp
  if (body.armorClass !== undefined) data.armorClass = body.armorClass
  if (body.strength !== undefined) data.strength = body.strength
  if (body.dexterity !== undefined) data.dexterity = body.dexterity
  if (body.constitution !== undefined) data.constitution = body.constitution
  if (body.intelligence !== undefined) data.intelligence = body.intelligence
  if (body.wisdom !== undefined) data.wisdom = body.wisdom
  if (body.charisma !== undefined) data.charisma = body.charisma
  if (body.inventory !== undefined) data.inventory = JSON.stringify(body.inventory)
  if (body.backstory !== undefined) data.backstory = body.backstory
  if (body.prologue !== undefined) data.prologue = body.prologue
  if (body.xp !== undefined && body.xp !== null) data.xp = body.xp
  if (body.nextLevelXp !== undefined && body.nextLevelXp !== null) data.nextLevelXp = body.nextLevelXp

  if (body.campaignId !== undefined) {
    if (body.campaignId === null) {
      data.campaignId = null
    } else {
      const campaignIdValue = Number(body.campaignId)
      if (!Number.isNaN(campaignIdValue)) {
        data.campaignId = campaignIdValue
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const character = await prisma.character.update({
    where: { id },
    data
  })

  const mapped = mapCharacter(character)

  if (mapped.campaignId) {
    try {
      await pusher.trigger(`campaign-${mapped.campaignId}`, 'character-created', mapped)
    } catch (error) {
      console.error('Pusher trigger failed for character-created:', error)
    }
  }

  return NextResponse.json(mapped)
}
