'use client'
import React, { useState } from 'react'
import { getClassByName } from '../lib/characterClasses'
import type { InventoryItem, ItemRarity, ItemType, CharacterAbility } from '../lib/types'

// ── Ability type styles ───────────────────────────────────────────
const ABILITY_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  combat:  { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.22)',   color: '#f87171', label: 'Combate' },
  magic:   { bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.25)', color: '#a78bfa', label: 'Magia' },
  support: { bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.22)',  color: '#60a5fa', label: 'Suporte' },
  utility: { bg: 'rgba(74,222,128,0.05)',  border: 'rgba(74,222,128,0.18)',  color: '#4ade80', label: 'Utilidade' },
}

type Attrs = {
  str: number; dex: number; con: number; int: number; wis: number; cha: number
}

// ── Rarity ───────────────────────────────────────────────────────
const RARITY_COLOR: Record<ItemRarity, string> = {
  comum:        'rgba(138,122,88,0.8)',
  incomum:      '#4ade80',
  raro:         '#a78bfa',
  amaldiçoado:  '#f87171',
}
const RARITY_BG: Record<ItemRarity, string> = {
  comum:        'rgba(138,122,88,0.08)',
  incomum:      'rgba(74,222,128,0.08)',
  raro:         'rgba(167,139,250,0.08)',
  amaldiçoado:  'rgba(248,113,113,0.08)',
}

// ── Type icons ────────────────────────────────────────────────────
const TYPE_ICON: Record<ItemType, string> = {
  chave:       '🗝️',
  poção:       '⚗️',
  arma:        '⚔️',
  pista:       '🔍',
  artefato:    '💎',
  equipamento: '🎒',
}

// ── Auto-detection ────────────────────────────────────────────────
function detectType(name: string): ItemType {
  const n = (name ?? '').toLowerCase()
  if (/poção|elixir|frasco|bebida/.test(n)) return 'poção'
  if (/espada|machado|adaga|arco|lança|faca|bastão|cajado|mace/.test(n)) return 'arma'
  if (/chave/.test(n)) return 'chave'
  if (/pista|nota|carta|pergaminho|diário|mapa|relatório/.test(n)) return 'pista'
  if (/mochila|cantil|tocha|corda|lanterna|bainha|coldre/.test(n)) return 'equipamento'
  return 'artefato'
}

function detectRarity(name: string): ItemRarity {
  const n = (name ?? '').toLowerCase()
  if (/amaldiçoado|maldito|corrompido|sombrio/.test(n)) return 'amaldiçoado'
  if (/raro|mágico|encantado|lendário|único|sagrado/.test(n)) return 'raro'
  if (/incomum|especial|fino|reforçado|superior/.test(n)) return 'incomum'
  return 'comum'
}

// ── Parse inventory entry (string | JSON string | object) ─────────
function parseItem(raw: unknown): InventoryItem {
  if (raw !== null && typeof raw === 'object') {
    const obj = raw as any
    return {
      name:        obj.name ?? String(raw),
      description: obj.description ?? null,
      rarity:      obj.rarity ?? detectRarity(obj.name ?? ''),
      type:        obj.type   ?? detectType(obj.name ?? ''),
    }
  }
  const str = String(raw)
  try {
    const parsed = JSON.parse(str)
    if (parsed && typeof parsed === 'object' && parsed.name) {
      return {
        name:        parsed.name,
        description: parsed.description ?? null,
        rarity:      parsed.rarity ?? detectRarity(parsed.name),
        type:        parsed.type   ?? detectType(parsed.name),
      }
    }
  } catch { /* plain string */ }
  return {
    name:   str,
    rarity: detectRarity(str),
    type:   detectType(str),
  }
}

// ── Stat rune ─────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, (value / 20) * 100)
  return (
    <div className="relative stat-rune">
      <div className="text-xs attr-label uppercase tracking-[0.2em] mb-2">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="w-full bg-[rgba(255,255,255,0.05)] h-1 rounded mt-3 overflow-hidden">
        <div style={{ width: `${pct}%` }} className="h-1 bg-gradient-to-r from-arcane to-gold rounded" />
      </div>
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────────
function ItemCard({
  item,
  characterId,
  onUsed,
}: {
  item: InventoryItem
  characterId?: string
  onUsed?: (updatedInventory: InventoryItem[], newHp?: number) => void
}) {
  const [using, setUsing] = useState(false)
  const rarity = item.rarity ?? 'comum'
  const type   = item.type   ?? 'artefato'
  const color  = RARITY_COLOR[rarity]
  const bg     = RARITY_BG[rarity]
  const icon   = TYPE_ICON[type]
  const qty    = item.quantity ?? 1
  const canUse = type === 'poção' && !!item.effect && item.effect.kind !== 'none' && !!characterId

  async function handleUse() {
    if (!characterId || using) return
    setUsing(true)
    try {
      const r = await fetch(`/api/characters/${characterId}/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use', itemId: item.id, itemName: item.name }),
      })
      if (r.ok) {
        const data = await r.json()
        onUsed?.(data.inventory, data.hp)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('oraculo:character-updated', {
            detail: { characterId, hp: data.hp },
          }))
        }
      }
    } finally {
      setUsing(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 9px',
      background: bg,
      border: `1px solid ${color}22`,
      borderRadius: 4,
      transition: 'border-color 0.2s',
    }}>
      <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '0.78rem', color: '#c8b070', fontWeight: 500, lineHeight: 1.3 }}>
            {item.name}
          </div>
          {qty > 1 && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(212,177,106,0.5)', background: 'rgba(212,177,106,0.08)', borderRadius: 3, padding: '1px 4px' }}>
              ×{qty}
            </span>
          )}
        </div>
        {item.description && (
          <div style={{ fontSize: '0.65rem', color: '#6a5838', lineHeight: 1.35, marginTop: 1 }}>
            {item.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color, fontFamily: 'Cinzel, serif', opacity: 0.9 }}>
          {rarity}
        </div>
        {canUse && (
          <button
            onClick={handleUse}
            disabled={using || qty <= 0}
            style={{
              fontSize: '0.55rem', letterSpacing: '0.06em',
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 3, padding: '2px 6px',
              color: '#4ade80', cursor: 'pointer',
              opacity: using || qty <= 0 ? 0.4 : 1,
            }}
          >
            {using ? '...' : 'Usar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── CharacterSheet ────────────────────────────────────────────────
export default function CharacterSheet({ character }: any) {
  const attrs: Attrs       = character.attributes
  const [currentHp, setCurrentHp] = useState<number>(character.hp ?? 0)
  const [liveInventory, setLiveInventory] = useState<InventoryItem[] | null>(null)

  const hp = currentHp
  const hpPercent          = Math.min(100, (hp / Math.max(hp, 40)) * 100)
  const xp                 = character.xp ?? 0
  const nextLevelXp        = character.nextLevelXp ?? 100
  const xpPct              = Math.min(100, (xp / nextLevelXp) * 100)
  const level              = character.level ?? 1

  const rawInventory: unknown[] = liveInventory
    ? liveInventory
    : Array.isArray(character.inventory) ? character.inventory : []
  const items: InventoryItem[] = rawInventory.map(parseItem)

  const classConfig = character.className ? getClassByName(character.className) : null
  const suggestedRole = classConfig?.suggestedRole ?? null
  const subclass: string | null = character.subclass ?? null
  const abilities: CharacterAbility[] = Array.isArray(character.abilities) ? character.abilities : []

  return (
    <div className="character-sheet space-y-5">

      {/* Name + level badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold title-cinematic">{character.name}</div>
          <div className="text-sm text-muted mt-0.5">{character.race} · {character.className}{subclass ? ` — ${subclass}` : ''}</div>
          {suggestedRole && (
            <div className="text-xs mt-0.5" style={{ color: 'rgba(212,177,106,0.6)' }}>{suggestedRole}</div>
          )}
        </div>
        <div style={{
          flexShrink: 0, padding: '3px 10px', textAlign: 'center',
          background: 'rgba(212,177,106,0.08)',
          border: '1px solid rgba(212,177,106,0.22)', borderRadius: 4,
        }}>
          <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(212,177,106,0.5)', fontFamily: 'Cinzel, serif' }}>Nível</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e0c870', fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>{level}</div>
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(212,177,106,0.45)', fontFamily: 'Cinzel, serif' }}>Experiência</div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(212,177,106,0.55)' }}>{xp} / {nextLevelXp} XP</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(212,177,106,0.1)' }}>
          <div style={{
            height: '100%', width: `${xpPct}%`,
            background: 'linear-gradient(90deg, rgba(79,70,229,0.7), rgba(212,177,106,0.85))',
            boxShadow: '0 0 8px rgba(212,177,106,0.3)', borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
        {xpPct >= 90 && (
          <div style={{ fontSize: '0.6rem', color: '#d4b16a', marginTop: 3, textAlign: 'right', fontStyle: 'italic' }}>Quase lá...</div>
        )}
      </div>

      {/* HP + AC */}
      <div className="flex items-center justify-between gap-4">
        <div style={{ flex: 1 }}>
          <div className="text-xs text-muted uppercase tracking-[0.2em] mb-2">Vigor</div>
          <div className="hp-vial overflow-hidden rounded-full">
            <div style={{ width: `${hpPercent}%` }} className="h-3 bg-gradient-to-r from-gold to-arcane" />
          </div>
          <div className="text-xs text-muted mt-1">{hp} HP</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted uppercase tracking-[0.2em] mb-2">Armadura</div>
          <div className="text-2xl font-semibold text-gold">{character.ac}</div>
        </div>
      </div>

      {/* Attributes */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="FOR" value={attrs.str} />
        <Stat label="DES" value={attrs.dex} />
        <Stat label="CON" value={attrs.con} />
        <Stat label="INT" value={attrs.int} />
        <Stat label="SAB" value={attrs.wis} />
        <Stat label="CAR" value={attrs.cha} />
      </div>

      {/* Inventory */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.6rem',
        }}>
          <div style={{
            fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.18em',
            color: 'rgba(212,177,106,0.45)', fontFamily: 'Cinzel, serif',
          }}>
            Inventário
          </div>
          {items.length > 0 && (
            <span style={{
              fontSize: '0.55rem', color: 'rgba(212,177,106,0.3)',
              fontFamily: 'Cinzel, serif', letterSpacing: '0.1em',
            }}>
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {items.map((item, i) => (
              <ItemCard
                key={item.id ?? i}
                item={item}
                characterId={character.id}
                onUsed={(inv, newHp) => {
                  setLiveInventory(inv)
                  if (newHp != null) setCurrentHp(newHp)
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '0.75rem', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(212,177,106,0.1)',
            borderRadius: 4,
            fontSize: '0.72rem', color: '#5a4820',
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
          }}>
            Nenhum item carregado.
          </div>
        )}
      </div>

      {/* Abilities */}
      {abilities.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.18em',
            color: 'rgba(212,177,106,0.45)', fontFamily: 'Cinzel, serif',
            marginBottom: '0.6rem',
          }}>
            Habilidades
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {abilities.map((ab, i) => {
              const style = ABILITY_STYLE[ab.type] ?? ABILITY_STYLE.utility
              return (
                <div key={ab.id ?? i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '6px 9px',
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: 4,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: style.color, lineHeight: 1.3 }}>
                        {ab.name}
                      </span>
                      <span style={{
                        fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: style.color, opacity: 0.75, fontFamily: 'Cinzel, serif',
                      }}>
                        {style.label}
                      </span>
                      {ab.usesPerScene != null && (
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', flexShrink: 0 }}>
                          {ab.usesPerScene}× / cena
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                      {ab.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
