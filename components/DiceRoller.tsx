"use client"
import React, { useEffect, useState } from 'react'
import D20DiceCss from './D20DiceCss'
import {
  saveMessage, getPendingTest, clearPendingTest,
  getCombatState, saveCombatState, clearCombatState, getActiveCharacter, saveCharacter,
} from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { updateCharacter } from '../lib/api/characters'
import { generateTestOutcomeMessage } from '../lib/masterEngine'
import {
  calculateRollTotal, formatRollMessage,
  getAttributeForRollType, getAttributeLabel, getCharacterAttributeValue,
} from '../lib/attributeRolls'
import {
  calculateAttackDamage, calculateEnemyDamage,
  applyDamage, formatDamageMessage, formatMissMessage, formatEnemyMissMessage,
} from '../lib/combatDamage'
import type { CombatState, Message, PendingTest } from '../lib/types'

type DiceRollerProps = {
  campaignId: string
  isMyTurn?: boolean
  currentActorName?: string | null
}

const ROLL_LABELS: Record<string, string> = {
  ataque:       'Ataque',
  investigacao: 'Investigação',
  percepcao:    'Percepção',
  carisma:      'Carisma',
  destreza:     'Destreza',
  forca:        'Força',
  arcano:       'Arcano',
  cura:         'Cura',
  sabedoria:    'Sabedoria',
  geral:        'Geral',
}

/** Dispatch a DOM event so page.tsx can sync activeCharacter state */
function dispatchCharacterUpdated(characterId: string, newHp: number) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('oraculo:character-updated', {
    detail: { characterId, hp: newHp },
  }))
}

export default function DiceRoller({ campaignId, isMyTurn = true, currentActorName }: DiceRollerProps) {
  const [last, setLast]       = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [pending, setPending] = useState<PendingTest | null>(null)
  const blocked = isMyTurn === false

  useEffect(() => {
    const check = () => setPending(getPendingTest(campaignId))
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [campaignId])

  async function roll() {
    if (rolling || blocked) return
    setRolling(true)
    const d20 = Math.floor(Math.random() * 20) + 1

    setTimeout(async () => {
      setLast(d20)
      setRolling(false)

      const character = getActiveCharacter()
      const currentPendingTest = getPendingTest(campaignId)

      // ── Simple roll (no pending test) ───────────────────────────────────────
      if (!currentPendingTest) {
        await postSystem(campaignId, `🎲 Rolagem d20: **${d20}**`)
        setPending(null)
        return
      }

      const rollType = currentPendingTest.type
      const cd       = currentPendingTest.difficultyClass
      const noChar   = !character

      // Compute breakdown (d20 + attribute)
      const breakdown = calculateRollTotal({ d20, rollType, character })
      const { total, isCriticalSuccess, isCriticalFail, attributeLabel, attributeValue } = breakdown
      const signedAttr = attributeValue >= 0 ? `+${attributeValue}` : `${attributeValue}`

      // Announce the roll immediately
      await postSystem(
        campaignId,
        [
          `🎲 ${ROLL_LABELS[rollType] ?? rollType} CD ${cd}`,
          `D20: ${d20}   ${attributeLabel}: ${signedAttr}   Total: **${total}**`,
          noChar ? '⚠️ Sem personagem ativo — atributo não somado.' : '',
        ].filter(Boolean).join('\n')
      )

      // ── ATTACK TEST ─────────────────────────────────────────────────────────
      if (rollType === 'ataque') {
        const combat = getCombatState(campaignId) as CombatState | null

        if (!combat) {
          // No active combat state — treat as generic test
          goto_generic: {
            const outcome = generateTestOutcomeMessage(
              isCriticalSuccess ? 20 : isCriticalFail ? 1 : total, cd, rollType
            )
            const msg = formatRollMessage(breakdown, cd, outcome, noChar)
            await postMaster(campaignId, msg)
          }
          clearPendingTest(campaignId)
          setPending(null)
          return
        }

        const enemy  = combat.combatants.find(c => c.type === 'enemy' && c.hp > 0)
        const player = combat.combatants.find(c => c.type === 'player')
        const charStr  = character?.attributes?.str ?? 10
        const strBonus = charStr - 10  // raw modifier (not halved yet — combatDamage uses it)

        if (!enemy) {
          await postMaster(campaignId, 'Não há inimigos válidos para atacar.')
        } else {
          const hit      = isCriticalSuccess || (!isCriticalFail && total >= enemy.armorClass)
          const critHit  = isCriticalSuccess
          const critMiss = isCriticalFail

          if (!hit) {
            const txt = critMiss
              ? `💀 Falha crítica! O ataque sai terrivelmente errado — você se expõe ao contra-ataque.`
              : formatMissMessage(character?.name ?? 'Personagem', enemy.name)
            await postMaster(campaignId, txt)
          } else {
            // Deal damage
            const dmgRoll = calculateAttackDamage({ strBonus, critical: critHit })
            const prevHp  = enemy.hp
            enemy.hp = applyDamage(enemy.hp, dmgRoll.totalDamage)
            combat.logs.push({ id: `log-${Date.now()}`, combatId: combat.id, text: `Jogador ataca: ${dmgRoll.totalDamage} de dano`, createdAt: new Date().toISOString() })
            saveCombatState(combat)
            dispatchCombatUpdated()

            await postMaster(
              campaignId,
              formatDamageMessage({
                attackerName: character?.name ?? 'Personagem',
                targetName: enemy.name,
                damageRoll: dmgRoll,
                previousHp: prevHp,
                newHp: enemy.hp,
                isPlayer: true,
              })
            )

            if (enemy.hp <= 0) {
              await postMaster(campaignId, `☠️ ${enemy.name} foi derrotado! O perigo se dissipa... por enquanto.`)
              clearCombatState(campaignId)
              dispatchCombatUpdated()
              clearPendingTest(campaignId)
              setPending(null)
              return
            }
          }

          // ── Enemy counter-attack ──────────────────────────────────────────
          if (player && enemy.hp > 0) {
            const eRoll   = Math.floor(Math.random() * 20) + 1
            const eCrit   = eRoll === 20
            const eCritMiss = eRoll === 1
            const eHit    = eCrit || (!eCritMiss && eRoll >= (player.armorClass ?? 10))

            if (!eHit) {
              await postMaster(campaignId, formatEnemyMissMessage(enemy.name, player.name))
            } else {
              const eDmg   = calculateEnemyDamage(eCrit)
              const prevPHp = player.hp
              player.hp  = applyDamage(player.hp, eDmg.totalDamage)
              combat.logs.push({ id: `log-${Date.now()}-e`, combatId: combat.id, text: `Inimigo contra-ataca: ${eDmg.totalDamage} de dano`, createdAt: new Date().toISOString() })
              saveCombatState(combat)
              dispatchCombatUpdated()

              await postMaster(
                campaignId,
                formatDamageMessage({
                  attackerName: enemy.name,
                  targetName: player.name,
                  damageRoll: eDmg,
                  previousHp: prevPHp,
                  newHp: player.hp,
                  isPlayer: false,
                })
              )

              // Persist player HP to DB + localStorage
              if (character) {
                const newHp = applyDamage(character.hp, eDmg.totalDamage, character.hp + 999)
                // Use the damage already applied to the player combatant
                const updatedChar = { ...character, hp: player.hp }
                saveCharacter(updatedChar)
                dispatchCharacterUpdated(character.id, player.hp)
                updateCharacter(character.id, { hp: player.hp }).catch(() => {})
              }

              if (player.hp <= 0) {
                await postMaster(campaignId, `💀 ${player.name} cai em combate... O silêncio é pesado.`)
                clearCombatState(campaignId)
                dispatchCombatUpdated()
              }
            }
          }
        }

        clearPendingTest(campaignId)
        setPending(null)
        return
      }

      // ── GENERIC TEST (with attribute bonus) ─────────────────────────────────
      {
        const outcome = generateTestOutcomeMessage(
          isCriticalSuccess ? 20 : isCriticalFail ? 1 : total,
          cd,
          rollType,
        )
        const msg = formatRollMessage(breakdown, cd, outcome, noChar)
        await postMaster(campaignId, msg)
        clearPendingTest(campaignId)
        setPending(null)
      }
    }, 700)
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const character  = typeof window !== 'undefined' ? getActiveCharacter() : null
  const rollType   = pending?.type ?? ''
  const attrKey    = rollType ? getAttributeForRollType(rollType) : null
  const attrLabel  = attrKey  ? getAttributeLabel(attrKey) : null
  const attrValue  = (attrKey && character) ? getCharacterAttributeValue(character, attrKey) : null
  const typeLabel  = rollType ? (ROLL_LABELS[rollType] ?? rollType) : null

  return (
    <div className="flex flex-col items-center gap-2">

      {/* Blocked notice */}
      {blocked && (
        <div className="text-xs px-3 py-1.5 rounded-lg text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', minWidth: '140px' }}>
          <div style={{ fontSize: '0.55rem', opacity: 0.6, marginBottom: 1 }}>Aguardando turno</div>
          <div>{currentActorName ?? 'outro jogador'}</div>
        </div>
      )}

      {/* Pending test badge with attribute preview */}
      {!blocked && pending && (
        <div className="text-xs px-3 py-2 rounded-lg text-center animate-pulse"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', minWidth: '160px' }}>
          <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: 3 }}>
            Teste pendente
          </div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {typeLabel} CD {pending.difficultyClass}
          </div>
          {attrLabel && attrValue !== null && (
            <div style={{ fontSize: '0.65rem', color: 'rgba(248,113,113,0.75)', marginBottom: 2 }}>
              Bônus: {attrLabel} {attrValue >= 0 ? `+${attrValue}` : attrValue}
            </div>
          )}
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
            D20 + {attrLabel ?? 'atributo'}
          </div>
        </div>
      )}

      {/* Last roll */}
      {!blocked && last !== null && !pending && (
        <div className="text-xs px-3 py-1.5 rounded-lg text-center"
          style={{ background: 'rgba(212,177,106,0.06)', border: '1px solid rgba(212,177,106,0.2)', color: 'rgba(212,177,106,0.8)', minWidth: '160px' }}>
          <div style={{ fontSize: '0.55rem', opacity: 0.6, marginBottom: 2 }}>Último resultado</div>
          <div style={{ fontWeight: 700 }}>D20: {last}</div>
        </div>
      )}

      <D20DiceCss
        result={last}
        rolling={rolling}
        onRoll={blocked ? undefined : roll}
        highlight={!blocked && !!pending}
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function postMaster(campaignId: string, content: string) {
  const payload = { author: 'Mestre IA', role: 'master' as const, content }
  const msg = await createMessage(campaignId, payload)
  saveMessage(msg ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...payload })
}

async function postSystem(campaignId: string, content: string) {
  const payload = { author: 'Sistema', role: 'system' as const, content }
  const msg = await createMessage(campaignId, payload)
  saveMessage(msg ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...payload })
}

function dispatchCombatUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('oraculo:combat-updated'))
}
