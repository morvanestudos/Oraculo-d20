"use client"
import React, { useEffect, useState } from 'react'
import D20DiceCss from './D20DiceCss'
import {
  saveMessage, getPendingTest, clearPendingTest,
  getCombatState, saveCombatState, clearCombatState, getActiveCharacter,
} from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { generateTestOutcomeMessage } from '../lib/masterEngine'
import {
  calculateRollTotal, formatRollMessage,
  getAttributeForRollType, getAttributeLabel, getCharacterAttributeValue,
} from '../lib/attributeRolls'
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

      const character    = getActiveCharacter()
      const currentPendingTest = getPendingTest(campaignId)

      // ── Simple roll (no pending test) ───────────────────────────────────────
      if (!currentPendingTest) {
        const rollMsg = {
          author: 'Sistema',
          role: 'system' as const,
          content: `🎲 Rolagem d20: **${d20}**`,
        }
        const created = await createMessage(campaignId, rollMsg)
        saveMessage(created ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...rollMsg })
        setPending(null)
        return
      }

      const rollType = currentPendingTest.type
      const cd       = currentPendingTest.difficultyClass
      const noChar   = !character

      // ── Compute breakdown with attribute bonus ──────────────────────────────
      const breakdown = calculateRollTotal({ d20, rollType, character })
      const { total, isCriticalSuccess, isCriticalFail } = breakdown

      // For the system "roll announced" message
      const attrLabel = breakdown.attributeLabel
      const attrVal   = breakdown.attributeValue
      const signedAttr = attrVal >= 0 ? `+${attrVal}` : `${attrVal}`
      const rollAnnounce = {
        author: 'Sistema',
        role: 'system' as const,
        content: [
          `🎲 ${ROLL_LABELS[rollType] ?? rollType} CD ${cd}`,
          `D20: ${d20}   ${attrLabel}: ${signedAttr}   Total: **${total}**`,
          noChar ? '⚠️ Sem personagem ativo — atributo não somado.' : '',
        ].filter(Boolean).join('\n'),
      }
      const announcedMsg = await createMessage(campaignId, rollAnnounce)
      saveMessage(announcedMsg ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...rollAnnounce })

      // ── Combat attack (d20+STR vs enemy AC) ────────────────────────────────
      if (rollType === 'ataque') {
        const combat = getCombatState(campaignId) as CombatState | null
        if (combat) {
          const enemy  = combat.combatants.find(c => c.type === 'enemy' && c.hp > 0)
          const player = combat.combatants.find(c => c.type === 'player')

          if (!enemy) {
            await postMaster(campaignId, 'Não há inimigos válidos para atacar.')
          } else {
            let attackText = ''
            if (isCriticalSuccess) {
              const dmg = (Math.floor(Math.random() * 8) + 1 + Math.floor(attrVal / 2)) * 2
              enemy.hp = Math.max(0, enemy.hp - dmg)
              attackText = `🌟 Acerto crítico! Um golpe devastador causa **${dmg} de dano** em ${enemy.name}.`
            } else if (isCriticalFail) {
              attackText = `💀 Falha crítica! Seu ataque sai terrivelmente errado — você se expõe.`
            } else if (total >= enemy.armorClass) {
              const dmg = Math.floor(Math.random() * 8) + 1 + Math.max(0, Math.floor(attrVal / 4))
              enemy.hp = Math.max(0, enemy.hp - dmg)
              attackText = `✅ Acertou ${enemy.name}! **${dmg} de dano** (total ${total} vs CA ${enemy.armorClass}).`
            } else {
              attackText = `❌ Ataque falhou — total ${total} não alcança CA ${enemy.armorClass} de ${enemy.name}.`
            }

            combat.logs.push({ id: `log-${Date.now()}`, combatId: combat.id, text: attackText, createdAt: new Date().toISOString() })
            saveCombatState(combat)
            await postMaster(campaignId, attackText)

            if (enemy.hp <= 0) {
              await postMaster(campaignId, `${enemy.name} foi derrotado! O perigo se dissipa... por enquanto.`)
              clearCombatState(campaignId)
              clearPendingTest(campaignId)
              setPending(null)
              return
            }

            if (player) {
              const eRoll = Math.floor(Math.random() * 20) + 1
              let eText = ''
              if (eRoll === 20) {
                const dmg = (Math.floor(Math.random() * 6) + 1 + 1) * 2
                player.hp = Math.max(0, player.hp - dmg)
                eText = `${enemy.name} contra-ataca com um golpe crítico causando ${dmg} de dano!`
              } else if (eRoll === 1) {
                eText = `${enemy.name} falha miseravelmente no contra-ataque.`
              } else if (eRoll >= player.armorClass) {
                const dmg = Math.floor(Math.random() * 6) + 1 + 1
                player.hp = Math.max(0, player.hp - dmg)
                eText = `${enemy.name} contra-ataca e causa ${dmg} de dano em ${player.name}.`
              } else {
                eText = `${enemy.name} tenta revidar, mas erra.`
              }
              combat.logs.push({ id: `log-${Date.now()}-e`, combatId: combat.id, text: eText, createdAt: new Date().toISOString() })
              saveCombatState(combat)
              await postMaster(campaignId, eText)

              if (player.hp <= 0) {
                await postMaster(campaignId, `${player.name} cai em combate... O silêncio é pesado.`)
                clearCombatState(campaignId)
              }
            }
          }
          clearPendingTest(campaignId)
          setPending(null)
          return
        }
      }

      // ── Generic test with attribute bonus ──────────────────────────────────
      const outcome = generateTestOutcomeMessage(
        isCriticalSuccess ? 20 : isCriticalFail ? 1 : total,
        cd,
        rollType,
      )
      const fullMsg = formatRollMessage(breakdown, cd, outcome, noChar)
      await postMaster(campaignId, fullMsg)

      clearPendingTest(campaignId)
      setPending(null)
    }, 700)
  }

  // ── Derived display values ───────────────────────────────────────────────
  const character   = typeof window !== 'undefined' ? getActiveCharacter() : null
  const rollType    = pending?.type ?? ''
  const attrKey     = rollType ? getAttributeForRollType(rollType) : null
  const attrLabel   = attrKey  ? getAttributeLabel(attrKey) : null
  const attrValue   = (attrKey && character) ? getCharacterAttributeValue(character, attrKey) : null
  const typeLabel   = rollType ? (ROLL_LABELS[rollType] ?? rollType) : null

  return (
    <div className="flex flex-col items-center gap-2">

      {/* ── Blocked notice ─────────────────────────────────────────────────── */}
      {blocked && (
        <div
          className="text-xs px-3 py-1.5 rounded-lg text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
            minWidth: '140px',
          }}
        >
          <div style={{ fontSize: '0.55rem', opacity: 0.6, marginBottom: 1 }}>Aguardando turno</div>
          <div>{currentActorName ?? 'outro jogador'}</div>
        </div>
      )}

      {/* ── Pending test badge with attribute preview ──────────────────────── */}
      {!blocked && pending && (
        <div
          className="text-xs px-3 py-2 rounded-lg text-center animate-pulse"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171',
            minWidth: '160px',
          }}
        >
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

      {/* ── Last roll breakdown (shown after rolling with pending test) ────── */}
      {!blocked && last !== null && !pending && (
        <div
          className="text-xs px-3 py-1.5 rounded-lg text-center"
          style={{
            background: 'rgba(212,177,106,0.06)',
            border: '1px solid rgba(212,177,106,0.2)',
            color: 'rgba(212,177,106,0.8)',
            minWidth: '160px',
          }}
        >
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

// ── Helper ──────────────────────────────────────────────────────────────────
async function postMaster(campaignId: string, content: string) {
  const payload = { author: 'Mestre IA', role: 'master' as const, content }
  const msg = await createMessage(campaignId, payload)
  saveMessage(msg ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...payload })
}
