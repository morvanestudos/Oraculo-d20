import type { Character, CharacterCreateDTO, CharacterPatchDTO } from '../types'

const API_BASE = '/api/characters'

function parseCharacterApiResponse(data: any): Character {
  const inventory = Array.isArray(data.inventory)
    ? data.inventory
    : typeof data.inventory === 'string'
    ? parseInventory(data.inventory)
    : []

  return {
    id: data.id,
    name: data.name,
    race: data.race,
    className: data.className ?? data.class ?? '',
    level: Number(data.level ?? 1),
    hp: Number(data.hp ?? 0),
    ac: Number(data.ac ?? 0),
    attributes: {
      str: Number(data.attributes?.str ?? data.attributes?.strength ?? 10),
      dex: Number(data.attributes?.dex ?? data.attributes?.dexterity ?? 10),
      con: Number(data.attributes?.con ?? data.attributes?.constitution ?? 10),
      int: Number(data.attributes?.int ?? data.attributes?.intelligence ?? 10),
      wis: Number(data.attributes?.wis ?? 10),
      cha: Number(data.attributes?.cha ?? 10)
    },
    inventory,
    story: data.story ?? data.backstory ?? '',
    campaignId: data.campaignId ?? null,
    createdAt: data.createdAt
  }
}

function parseInventory(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map(String)
    }
  } catch {
    // ignore
  }

  return raw.split(',').map(value => value.trim()).filter(Boolean)
}

export async function fetchCharacters(campaignId?: string): Promise<Character[]> {
  const url = campaignId ? `${API_BASE}?campaignId=${encodeURIComponent(campaignId)}` : API_BASE
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao buscar personagens: ${response.statusText}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data.map(parseCharacterApiResponse) : []
}

export async function fetchCharacterById(id: string): Promise<Character | null> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`)
  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return parseCharacterApiResponse(data)
}

export async function createCharacter(payload: CharacterCreateDTO): Promise<Character> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Falha ao criar personagem: ${response.statusText}`)
  }

  const data = await response.json()
  return parseCharacterApiResponse(data)
}

export async function updateCharacter(id: string, payload: CharacterPatchDTO): Promise<Character> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Falha ao atualizar personagem: ${response.statusText}`)
  }

  const data = await response.json()
  return parseCharacterApiResponse(data)
}
