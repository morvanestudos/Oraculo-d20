import type { InventoryItem, ItemType, ItemRarity, ItemEffect } from './types'

// ── Auto-detection (used when normalizing string items) ──────────────────────

function detectType(name: string): ItemType {
  const n = name.toLowerCase()
  if (/po[çc][aã]o|elixir|frasco|bebida/.test(n)) return 'poção'
  if (/espada|machado|adaga|arco|lança|faca|cajado|maça/.test(n)) return 'arma'
  if (/chave/.test(n)) return 'chave'
  if (/pista|nota|carta|pergaminho|diário|mapa/.test(n)) return 'pista'
  if (/mochila|cantil|tocha|corda|lanterna/.test(n)) return 'equipamento'
  return 'artefato'
}

function detectRarity(name: string): ItemRarity {
  const n = name.toLowerCase()
  if (/amaldiçoado|maldito|corrompido/.test(n)) return 'amaldiçoado'
  if (/raro|mágico|encantado|lendário|sagrado/.test(n)) return 'raro'
  if (/incomum|especial|reforçado|superior/.test(n)) return 'incomum'
  return 'comum'
}

function detectEffect(name: string, type: ItemType): ItemEffect | undefined {
  if (type !== 'poção') return undefined
  const n = name.toLowerCase()
  if (/cura|saúde|vida|heal/.test(n)) return { kind: 'heal', value: '1d8+2' }
  if (/dano|veneno|damage/.test(n))   return { kind: 'damage', value: '1d4' }
  return { kind: 'heal', value: '1d6+1' }  // default for any other potion
}

// ── Normalize ────────────────────────────────────────────────────────────────

/**
 * Convert any inventory representation (string array, JSON string, object array)
 * into a normalized InventoryItem[].
 */
export function normalizeInventory(raw: unknown): InventoryItem[] {
  let items: unknown[] = []

  if (Array.isArray(raw)) {
    items = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      items = Array.isArray(parsed) ? parsed : []
    } catch {
      items = raw.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  return items.map(item => {
    if (typeof item === 'string') {
      const type = detectType(item)
      return {
        id: slugId(item),
        name: item,
        type,
        rarity: detectRarity(item),
        quantity: 1,
        effect: detectEffect(item, type),
      } satisfies InventoryItem
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      const name = String(obj.name ?? '')
      const type = (obj.type as ItemType) ?? detectType(name)
      return {
        id: (obj.id as string) ?? slugId(name),
        name,
        description: (obj.description as string) ?? null,
        type,
        rarity: (obj.rarity as ItemRarity) ?? detectRarity(name),
        quantity: Number(obj.quantity ?? 1),
        effect: (obj.effect as ItemEffect) ?? detectEffect(name, type),
      } satisfies InventoryItem
    }
    return { id: `item-${Date.now()}`, name: String(item), quantity: 1 }
  })
}

function slugId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

// ── Mutation helpers ─────────────────────────────────────────────────────────

export function addItem(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const existing = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase())
  if (existing) {
    return inventory.map(i =>
      i === existing ? { ...i, quantity: (i.quantity ?? 1) + (item.quantity ?? 1) } : i
    )
  }
  return [...inventory, { id: slugId(item.name), quantity: 1, ...item }]
}

export function removeItem(inventory: InventoryItem[], nameOrId: string, qty = 1): InventoryItem[] {
  return inventory
    .map(i => {
      if (i.id === nameOrId || i.name.toLowerCase() === nameOrId.toLowerCase()) {
        const newQty = (i.quantity ?? 1) - qty
        return newQty <= 0 ? null : { ...i, quantity: newQty }
      }
      return i
    })
    .filter((i): i is InventoryItem => i !== null)
}

/**
 * Consume 1 quantity of a usable item.
 * Returns { updated, used } — used is the item that was consumed.
 */
export function useItem(
  inventory: InventoryItem[],
  nameOrId: string
): { updated: InventoryItem[]; used: InventoryItem | null } {
  const item = inventory.find(i => i.id === nameOrId || i.name.toLowerCase() === nameOrId.toLowerCase())
  if (!item) return { updated: inventory, used: null }
  return { updated: removeItem(inventory, nameOrId, 1), used: item }
}

// ── Healing calculator for potions ───────────────────────────────────────────

export function rollItemHeal(effect: ItemEffect): { rolls: number[]; total: number } {
  if (effect.kind !== 'heal') return { rolls: [], total: 0 }
  const val = effect.value ?? '1d6+1'
  const match = val.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) return { rolls: [], total: 4 }
  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const bonus = parseInt(match[3] ?? '0', 10)
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  return { rolls, total: Math.max(1, rolls.reduce((a, b) => a + b, 0) + bonus) }
}

export function formatUseItemMessage(params: {
  characterName: string
  item: InventoryItem
  rolls: number[]
  total: number
  previousHp: number
  newHp: number
  maxHp: number
}): string {
  const { characterName, item, rolls, total, previousHp, newHp, maxHp } = params
  const rollStr = rolls.length ? `[${rolls.join('+')}] = ${total}` : String(total)
  return [
    `🧪 ${characterName} usou **${item.name}**`,
    `Cura: ${rollStr}`,
    `HP: ${previousHp}/${maxHp} → ${newHp}/${maxHp}`,
  ].join('\n')
}
