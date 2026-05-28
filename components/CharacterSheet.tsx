import React from 'react'

type Attrs = {
  str: number; dex: number; con: number; int: number; wis: number; cha: number
}

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

export default function CharacterSheet({ character, editable }: any) {
  const attrs: Attrs = character.attributes
  const hpPercent = Math.min(100, (character.hp / 40) * 100)

  return (
    <div className="character-sheet space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold title-cinematic">{character.name}</div>
          <div className="text-sm text-muted">{character.race} • {character.className}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted uppercase tracking-[0.2em] mb-2">Vigor</div>
          <div className="hp-vial w-40 overflow-hidden rounded-full">
            <div style={{ width: `${hpPercent}%` }} className="h-3 bg-gradient-to-r from-gold to-arcane" />
          </div>
          <div className="text-sm mt-2">AC <span className="font-semibold text-gold">{character.ac}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="FOR" value={attrs.str} />
        <Stat label="DES" value={attrs.dex} />
        <Stat label="CON" value={attrs.con} />
        <Stat label="INT" value={attrs.int} />
        <Stat label="SAB" value={attrs.wis} />
        <Stat label="CAR" value={attrs.cha} />
      </div>

      <div>
        <div className="section-title">Inventário</div>
        <div className="grid grid-cols-1 gap-2">
          {character.inventory.map((it: string, i: number) => (
            <div key={i} className="inventory-item">
              <div className="text-sm">{it}</div>
              <div className="text-xs text-muted">x1</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
