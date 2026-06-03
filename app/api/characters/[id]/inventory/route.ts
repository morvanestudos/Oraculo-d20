import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import pusher from '../../../../../lib/pusher'
import type { InventoryPatchDTO, InventoryItem } from '../../../../../lib/types'
import {
  normalizeInventory, addItem, removeItem, useItem,
  rollItemHeal, formatUseItemMessage,
} from '../../../../../lib/inventorySystem'

async function getCharacter(id: number) {
  return prisma.character.findUnique({ where: { id } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const char = await getCharacter(id)
  if (!char) return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 })

  return NextResponse.json(normalizeInventory(char.inventory))
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const char = await getCharacter(id)
  if (!char) return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 })

  const body = await req.json() as InventoryPatchDTO
  let inventory = normalizeInventory(char.inventory)

  let chatMessage: string | null = null
  let hpChange: number | null = null

  // ── Actions ──────────────────────────────────────────────────────────────
  if (body.action === 'add' && body.item) {
    inventory = addItem(inventory, body.item as InventoryItem)
  }

  if (body.action === 'remove') {
    const nameOrId = body.itemId ?? body.itemName ?? body.item?.name ?? ''
    inventory = removeItem(inventory, nameOrId, body.quantity ?? 1)
  }

  if (body.action === 'use') {
    const nameOrId = body.itemId ?? body.itemName ?? body.item?.name ?? ''
    const { updated, used } = useItem(inventory, nameOrId)
    inventory = updated

    if (used?.effect?.kind === 'heal') {
      const { rolls, total } = rollItemHeal(used.effect)
      const currentHp = char.hp ?? 0
      // Use maxHp = current if we don't have a separate field; healing capped at 999 above current as proxy
      const newHp = Math.min(currentHp + total, currentHp + 999)
      hpChange = total

      chatMessage = formatUseItemMessage({
        characterName: char.name,
        item: used,
        rolls, total,
        previousHp: currentHp,
        newHp: Math.min(newHp, currentHp + total),
        maxHp: Math.max(currentHp, newHp),
      })
    }
  }

  if (body.action === 'set' && Array.isArray(body.item)) {
    inventory = body.item as unknown as InventoryItem[]
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const updateData: Record<string, unknown> = { inventory: JSON.stringify(inventory) }
  if (hpChange !== null) {
    const newHp = Math.max(0, (char.hp ?? 0) + hpChange)
    updateData.hp = newHp
  }

  const updated = await prisma.character.update({ where: { id }, data: updateData })

  // Broadcast
  if (updated.campaignId) {
    await pusher.trigger(`campaign-${updated.campaignId}`, 'character-updated', {
      characterId: String(id),
      hp: updated.hp,
      inventory,
    }).catch(() => {})
  }

  // Post chat message if action had a narrative result
  if (chatMessage && updated.campaignId) {
    await prisma.message.create({
      data: { campaignId: updated.campaignId, author: 'Sistema', role: 'system', content: chatMessage },
    }).catch(() => {})
    await pusher.trigger(`campaign-${updated.campaignId}`, 'new-message', {
      author: 'Sistema', role: 'system', content: chatMessage,
      campaignId: String(updated.campaignId), createdAt: new Date().toISOString(),
    }).catch(() => {})
  }

  return NextResponse.json({ inventory, hp: updated.hp })
}
