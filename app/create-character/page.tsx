'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveCharacter } from '../../lib/storage'
import { createCharacter } from '../../lib/api/characters'
import CharacterSheet from '../../components/CharacterSheet'
import FantasyBackground from '../../components/FantasyBackground'
import type { Character } from '../../lib/types'

export default function CreateCharacter() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [race, setRace] = useState('')
  const [className, setClassName] = useState('')
  const [level, setLevel] = useState(1)
  const [hp, setHp] = useState(10)
  const [ac, setAc] = useState(12)
  const [str, setStr] = useState(10)
  const [dex, setDex] = useState(10)
  const [con, setCon] = useState(10)
  const [intelligence, setIntelligence] = useState(10)
  const [wis, setWis] = useState(10)
  const [cha, setCha] = useState(10)
  const [inventory, setInventory] = useState('Espada longa, Poção de cura')
  const [story, setStory] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const character: Character = useMemo(() => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `char-${Date.now()}`,
    name: name || 'Personagem sem nome',
    race,
    className,
    level,
    hp,
    ac,
    attributes: { str, dex, con, int: intelligence, wis, cha },
    inventory: inventory.split(',').map(item => item.trim()).filter(Boolean),
    story
  }), [name, race, className, level, hp, ac, str, dex, con, intelligence, wis, cha, inventory, story])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !race.trim() || !className.trim()) {
      setStatus('error')
      return
    }

    setStatus('idle')

    try {
      const savedCharacter = await createCharacter({
        name: character.name,
        race: character.race,
        class: character.className,
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
        backstory: character.story
      })

      saveCharacter({
        ...character,
        id: savedCharacter.id,
        campaignId: savedCharacter.campaignId ?? null,
        createdAt: savedCharacter.createdAt
      })
      setStatus('success')
    } catch (apiError) {
      console.error('Falha ao salvar personagem no servidor:', apiError)
      saveCharacter(character)
      setStatus('success')
    }

    window.setTimeout(() => router.push('/dashboard'), 400)
  }

  return (
    <FantasyBackground image="/images/bg-character.jpg" overlayIntensity={0.70}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-6 py-12">
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="text-2xl font-bold mb-4">Criar personagem</h1>
        <form onSubmit={handleSubmit} className="space-y-5 panel glass rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Nome do personagem" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Espécie</label>
              <input value={race} onChange={e => setRace(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Humano, Elfo, Anão" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Classe</label>
              <input value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Guerreiro, Mago, Arqueiro" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nível</label>
              <input value={level} onChange={e => setLevel(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vida</label>
              <input value={hp} onChange={e => setHp(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Armadura</label>
              <input value={ac} onChange={e => setAc(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Força</label>
              <input value={str} onChange={e => setStr(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destreza</label>
              <input value={dex} onChange={e => setDex(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Constituição</label>
              <input value={con} onChange={e => setCon(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Inteligência</label>
              <input value={intelligence} onChange={e => setIntelligence(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sabedoria</label>
              <input value={wis} onChange={e => setWis(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Carisma</label>
              <input value={cha} onChange={e => setCha(Number(e.target.value))} type="number" min={1} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Inventário</label>
            <input value={inventory} onChange={e => setInventory(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg" placeholder="Separe itens com vírgula" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">História do personagem</label>
            <textarea value={story} onChange={e => setStory(e.target.value)} className="w-full bg-transparent border border-[rgba(255,255,255,0.08)] p-3 rounded-lg h-32" placeholder="Conte a origem e o motivo do aventureiro" />
          </div>

          {status === 'error' && <div className="text-sm text-blood">Preencha os campos de nome, espécie e classe.</div>}
          {status === 'success' && <div className="text-sm text-arcane">Personagem salvo com sucesso! Redirecionando...</div>}
          <div className="flex justify-end">
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-arcane to-accent text-black rounded-lg font-semibold shadow">Salvar personagem</button>
          </div>
        </form>
      </div>

      <div className="panel glass rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Prévia rápida</h2>
        <CharacterSheet character={character} />
      </div>
    </div>
        </div>
      </div>
    </FantasyBackground>
  )
}
