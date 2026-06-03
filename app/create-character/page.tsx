'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveCharacter, getPlayerId, getPlayerName } from '../../lib/storage'
import { createCharacter, updateCharacter } from '../../lib/api/characters'
import CharacterSheet from '../../components/CharacterSheet'
import FantasyBackground from '../../components/FantasyBackground'
import { CHARACTER_CLASSES, getClassById, ATTR_LABELS } from '../../lib/characterClasses'
import type { Character, CharacterAbility } from '../../lib/types'

const ABILITY_TYPE_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  combat:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171', label: 'Combate' },
  magic:   { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa', label: 'Magia' },
  support: { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', color: '#60a5fa', label: 'Suporte' },
  utility: { bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)',  color: '#4ade80', label: 'Utilidade' },
}

const INPUT_CLS = 'w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg text-sm focus:outline-none focus:border-[rgba(212,177,106,0.4)] transition'
const SELECT_CLS = 'w-full bg-[rgba(10,8,6,0.9)] border border-[rgba(255,255,255,0.08)] p-3 rounded-lg text-sm focus:outline-none focus:border-[rgba(212,177,106,0.4)] transition'
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wider mb-1.5'

export default function CreateCharacter() {
  const router = useRouter()

  // ── identity ──────────────────────────────────────────────────────
  const [name, setName]   = useState('')
  const [race, setRace]   = useState('')

  // ── class & subclass ──────────────────────────────────────────────
  const [classId, setClassId]     = useState('')
  const [subclassId, setSubclassId] = useState('')

  // ── combat stats ──────────────────────────────────────────────────
  const [level, setLevel] = useState(1)
  const [hp, setHp]       = useState(10)
  const [ac, setAc]       = useState(12)

  // ── attributes ────────────────────────────────────────────────────
  const [str, setStr]             = useState(10)
  const [dex, setDex]             = useState(10)
  const [con, setCon]             = useState(10)
  const [intelligence, setInt]    = useState(10)
  const [wis, setWis]             = useState(10)
  const [cha, setCha]             = useState(10)

  // ── inventory & story ─────────────────────────────────────────────
  const [inventory, setInventory] = useState('')
  const [story, setStory]         = useState('')

  // ── ui state ──────────────────────────────────────────────────────
  const [status, setStatus]                 = useState<'idle' | 'success' | 'error'>('idle')
  const [campaignIdParam, setCampaignIdParam] = useState<string | null>(null)
  const [returnToParam, setReturnToParam]     = useState('/dashboard')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setCampaignIdParam(p.get('campaignId'))
    setReturnToParam(p.get('returnTo') ?? '/dashboard')
  }, [])

  // ── derived values ────────────────────────────────────────────────
  const selectedClass = classId ? getClassById(classId) : null
  const selectedSubclass = selectedClass?.subclasses?.find(s => s.id === subclassId) ?? null

  // ── auto-fill when class changes ──────────────────────────────────
  function applyClassDefaults(id: string) {
    const cls = getClassById(id)
    if (!cls) return
    setStr(cls.baseAttributes.strength)
    setDex(cls.baseAttributes.dexterity)
    setCon(cls.baseAttributes.constitution)
    setInt(cls.baseAttributes.intelligence)
    setWis(cls.baseAttributes.wisdom)
    setCha(cls.baseAttributes.charisma)
    setHp(cls.startingHp)
    setAc(cls.startingArmorClass)
    setInventory(cls.startingInventory.join(', '))
  }

  function handleClassChange(id: string) {
    setClassId(id)
    setSubclassId('')
    applyClassDefaults(id)
  }

  // ── preview character ─────────────────────────────────────────────
  const character: Character = useMemo(() => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `char-${Date.now()}`,
    name: name || 'Personagem sem nome',
    race,
    className: selectedClass?.name ?? classId,
    subclass: selectedSubclass?.name ?? subclassId ?? null,
    abilities: (selectedClass?.startingAbilities ?? []) as CharacterAbility[],
    level,
    hp,
    ac,
    attributes: { str, dex, con, int: intelligence, wis, cha },
    inventory: inventory.split(',').map(i => i.trim()).filter(Boolean),
    story,
  }), [name, race, classId, subclassId, selectedClass, selectedSubclass, level, hp, ac, str, dex, con, intelligence, wis, cha, inventory, story])

  // ── submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !race.trim() || !classId) {
      setStatus('error')
      return
    }
    setStatus('idle')
    try {
      const saved = await createCharacter({
        name: character.name,
        race: character.race,
        class: character.className,
        subclass: character.subclass ?? null,
        abilities: character.abilities,
        level: character.level,
        hp: character.hp,
        armorClass: character.ac,
        strength: character.attributes.str,
        dexterity: character.attributes.dex,
        constitution: character.attributes.con,
        intelligence: character.attributes.int,
        wisdom: character.attributes.wis,
        charisma: character.attributes.cha,
        inventory: character.inventory,
        backstory: character.story,
        campaignId: campaignIdParam ?? undefined,
      })

      saveCharacter({ ...character, id: saved.id, campaignId: saved.campaignId ?? null, createdAt: saved.createdAt })

      if (campaignIdParam) {
        try { await updateCharacter(saved.id, { campaignId: campaignIdParam }) } catch { /* non-fatal */ }
        const pid = getPlayerId(); const pName = getPlayerName()
        if (pid && pName) {
          fetch(`/api/campaigns/${campaignIdParam}/players/link-character`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: pid, characterId: saved.id, characterName: saved.name }),
          }).catch(() => {})
        }
      }

      setStatus('success')
    } catch {
      saveCharacter(character)
      setStatus('success')
    }
    setTimeout(() => router.push(returnToParam), 400)
  }

  // ── primary attribute highlight ───────────────────────────────────
  const primaryAttrLabel = selectedClass ? ATTR_LABELS[selectedClass.primaryAttribute] : null

  return (
    <FantasyBackground image="/images/bg-character.jpg" overlayIntensity={0.70}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">

            {/* ── LEFT: Form ─────────────────────────────────────── */}
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                Forjar um Herói
              </h1>
              {campaignIdParam && (
                <p className="text-sm text-muted mb-4">Seu herói será convocado para a aventura automaticamente.</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 panel glass rounded-lg p-6">

                {/* Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} placeholder="Nome do personagem" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Espécie / Raça</label>
                    <input value={race} onChange={e => setRace(e.target.value)} className={INPUT_CLS} placeholder="Humano, Elfo, Anão..." />
                  </div>
                </div>

                {/* Class selector */}
                <div>
                  <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Classe</label>
                  <select value={classId} onChange={e => handleClassChange(e.target.value)} className={SELECT_CLS}>
                    <option value="">— Escolha uma classe —</option>
                    {CHARACTER_CLASSES.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                {/* Class card */}
                {selectedClass && (
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: 'rgba(212,177,106,0.05)', border: '1px solid rgba(212,177,106,0.25)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold" style={{ color: '#d4b16a', fontFamily: 'Cinzel, serif' }}>
                          {selectedClass.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {selectedClass.suggestedRole}
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <div className="text-center">
                          <div style={{ color: '#ef4444' }} className="font-bold text-sm">{selectedClass.startingHp}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)' }}>HP</div>
                        </div>
                        <div className="text-center">
                          <div style={{ color: '#60a5fa' }} className="font-bold text-sm">{selectedClass.startingArmorClass}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)' }}>CA</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {selectedClass.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,177,106,0.12)', color: '#d4b16a', border: '1px solid rgba(212,177,106,0.2)' }}>
                        ✦ {primaryAttrLabel}
                      </span>
                      {selectedClass.subclasses?.map(s => (
                        <span key={s.id} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abilities card */}
                {selectedClass && selectedClass.startingAbilities.length > 0 && (
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(212,177,106,0.6)' }}>
                      ✦ Habilidades Iniciais
                    </p>
                    <div className="space-y-2">
                      {selectedClass.startingAbilities.map(ab => {
                        const style = ABILITY_TYPE_STYLE[ab.type] ?? ABILITY_TYPE_STYLE.utility
                        return (
                          <div key={ab.id} className="rounded-lg p-3 flex gap-3 items-start"
                            style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold" style={{ color: style.color }}>{ab.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: `${style.border}44`, color: style.color, fontSize: '0.6rem', letterSpacing: '0.08em' }}>
                                  {style.label}
                                </span>
                                {ab.usesPerScene && (
                                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
                                    {ab.usesPerScene}× / cena
                                  </span>
                                )}
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{ab.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Subclass selector */}
                {selectedClass?.subclasses && selectedClass.subclasses.length > 0 && (
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Subclasse</label>
                    <select value={subclassId} onChange={e => setSubclassId(e.target.value)} className={SELECT_CLS}>
                      <option value="">— Escolha uma subclasse (opcional) —</option>
                      {selectedClass.subclasses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {selectedSubclass && (
                      <p className="mt-2 text-xs leading-relaxed px-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {selectedSubclass.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Level */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Nível</label>
                    <input value={level} onChange={e => setLevel(Number(e.target.value))} type="number" min={1} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Pontos de Vida</label>
                    <input value={hp} onChange={e => setHp(Number(e.target.value))} type="number" min={1} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Armadura (CA)</label>
                    <input value={ac} onChange={e => setAc(Number(e.target.value))} type="number" min={1} className={INPUT_CLS} />
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={LABEL_CLS + ' mb-0'} style={{ color: 'rgba(212,177,106,0.8)' }}>Atributos</label>
                    {selectedClass && (
                      <button
                        type="button"
                        onClick={() => applyClassDefaults(classId)}
                        className="text-xs px-3 py-1 rounded-full transition"
                        style={{ background: 'rgba(212,177,106,0.1)', color: '#d4b16a', border: '1px solid rgba(212,177,106,0.2)' }}
                      >
                        ↺ Restaurar atributos da classe
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Força', val: str, set: setStr, key: 'strength' },
                      { label: 'Destreza', val: dex, set: setDex, key: 'dexterity' },
                      { label: 'Constituição', val: con, set: setCon, key: 'constitution' },
                      { label: 'Inteligência', val: intelligence, set: setInt, key: 'intelligence' },
                      { label: 'Sabedoria', val: wis, set: setWis, key: 'wisdom' },
                      { label: 'Carisma', val: cha, set: setCha, key: 'charisma' },
                    ].map(({ label, val, set, key }) => {
                      const isPrimary = selectedClass?.primaryAttribute === key
                      return (
                        <div key={key}
                          className="rounded-lg p-3"
                          style={{
                            background: isPrimary ? 'rgba(212,177,106,0.07)' : 'rgba(255,255,255,0.02)',
                            border: isPrimary ? '1px solid rgba(212,177,106,0.25)' : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <label className="block text-xs mb-1.5" style={{ color: isPrimary ? '#d4b16a' : 'rgba(255,255,255,0.5)' }}>
                            {label}{isPrimary && ' ✦'}
                          </label>
                          <input
                            value={val}
                            onChange={e => set(Number(e.target.value))}
                            type="number"
                            min={1}
                            max={20}
                            className="w-full bg-transparent text-center text-lg font-bold focus:outline-none"
                            style={{ color: isPrimary ? '#d4b16a' : 'inherit' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Inventory */}
                <div>
                  <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>Inventário</label>
                  <input value={inventory} onChange={e => setInventory(e.target.value)} className={INPUT_CLS} placeholder="Separe itens com vírgula" />
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Preenchido automaticamente pela classe. Você pode editar.
                  </p>
                </div>

                {/* Story */}
                <div>
                  <label className={LABEL_CLS} style={{ color: 'rgba(212,177,106,0.8)' }}>História do personagem</label>
                  <textarea value={story} onChange={e => setStory(e.target.value)} className={INPUT_CLS + ' h-28 resize-none'} placeholder="Conte a origem e o motivo do aventureiro" />
                </div>

                {/* Status messages */}
                {status === 'error' && (
                  <div className="text-sm" style={{ color: '#ef4444' }}>
                    O escriba precisa do nome, espécie e classe para registrar o herói.
                  </div>
                )}
                {status === 'success' && (
                  <div className="text-sm" style={{ color: '#a78bfa' }}>
                    Seu nome agora ecoa pelos reinos.{campaignIdParam ? ' Retornando à aventura...' : ' Os anais são atualizados...'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-4">
                  {campaignIdParam && (
                    <a href={returnToParam} className="text-sm text-muted underline underline-offset-2 hover:text-gold transition">
                      ← Voltar à campanha
                    </a>
                  )}
                  <button type="submit" className="px-6 py-3 rounded-lg font-semibold shadow ml-auto transition"
                    style={{ background: 'linear-gradient(135deg, #d4b16a, #7c3aed)', color: '#000' }}>
                    Registrar nos Anais do Reino
                  </button>
                </div>
              </form>
            </div>

            {/* ── RIGHT: Preview ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="panel glass rounded-lg p-5">
                <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'Cinzel, serif', color: '#d4b16a' }}>
                  Visão do Oráculo
                </h2>
                <CharacterSheet character={character} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
