"use client"
import React, { useEffect, useState } from 'react'
import D20DiceCss from './D20DiceCss'
import { saveMessage, getPendingTest, clearPendingTest, getCombatState, saveCombatState, clearCombatState } from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { generateTestOutcomeMessage } from '../lib/masterEngine'
import type { CombatState, Message, PendingTest } from '../lib/types'

type DiceRollerProps = {
  campaignId: string
}

// Human-readable labels for each roll type
const ROLL_LABELS: Record<string, string> = {
  ataque:      'Ataque',
  investigacao: 'Investigação',
  percepcao:   'Percepção',
  carisma:     'Carisma',
  destreza:    'Destreza',
  forca:       'Força',
  arcano:      'Arcano',
  cura:        'Cura',
  sabedoria:   'Sabedoria',
  geral:       'Geral',
}

export default function DiceRoller({ campaignId }: DiceRollerProps) {
  const [last, setLast]         = useState<number | null>(null)
  const [rolling, setRolling]   = useState(false)
  const [pending, setPending]   = useState<PendingTest | null>(null)

  // Poll localStorage every second so the badge appears as soon as ChatBox saves a pendingTest
  useEffect(() => {
    const check = () => setPending(getPendingTest(campaignId))
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [campaignId])

  async function roll() {
    if (rolling) return
    setRolling(true)
    const v = Math.floor(Math.random() * 20) + 1

    setTimeout(async () => {
      setLast(v)
      setRolling(false)

      // Post roll result as system message (visible to everyone via Pusher)
      const rollMsg = {
        author: 'Sistema',
        role: 'system' as const,
        content: `🎲 Rolagem d20: **${v}**${pending ? ` — ${ROLL_LABELS[pending.type] ?? pending.type} CD ${pending.difficultyClass}` : ''}`,
      }
      const created = await createMessage(campaignId, rollMsg)
      saveMessage(created ?? { id: `tmp-${Date.now()}`, campaignId, createdAt: new Date().toISOString(), ...rollMsg })

      const currentPending = getPendingTest(campaignId)
      if (!currentPending) {
        setPending(null)
        return
      }

      // ── Combat attack ───────────────────────────────────────────────────────
      if (currentPending.type === 'ataque') {
        const combat = getCombatState(campaignId) as CombatState | null
        if (combat) {
          const enemy  = combat.combatants.find(c => c.type === 'enemy' && c.hp > 0)
          const player = combat.combatants.find(c => c.type === 'player')

          if (!enemy) {
            await postMaster(campaignId, 'Não há inimigos válidos para atacar.')
          } else {
            let attackText = ''
            if (v === 20) {
              const dmg = (Math.floor(Math.random() * 8) + 1 + 2) * 2
              enemy.hp = Math.max(0, enemy.hp - dmg)
              attackText = `Acerto crítico! Você desfere um golpe devastador causando ${dmg} de dano em ${enemy.name}.`
            } else if (v === 1) {
              attackText = 'Falha crítica! Seu ataque sai terrivelmente errado — você se expõe.'
            } else if (v >= enemy.armorClass) {
              const dmg = Math.floor(Math.random() * 8) + 1 + 2
              enemy.hp = Math.max(0, enemy.hp - dmg)
              attackText = `Acertou ${enemy.name} e causou ${dmg} de dano.`
            } else {
              attackText = `Seu ataque erra — ${enemy.name} esquiva ou bloqueia.`
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

            // Enemy counterattack
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

      // ── Generic test ────────────────────────────────────────────────────────
      const outcome = generateTestOutcomeMessage(v, currentPending.difficultyClass, currentPending.type)
      const margin  = v - currentPending.difficultyClass
      const marginTxt = v >= currentPending.difficultyClass
        ? `(+${margin} acima da CD)`
        : `(${margin} abaixo da CD)`
      const label = ROLL_LABELS[currentPending.type] ?? currentPending.type

      await postMaster(
        campaignId,
        `Teste de ${label} — rolou ${v} ${marginTxt}. ${outcome}`
      )
      clearPendingTest(campaignId)
      setPending(null)
    }, 700)
  }

  const label = pending ? ROLL_LABELS[pending.type] ?? pending.type : null

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pending test badge */}
      {pending && (
        <div
          className="text-xs px-3 py-1.5 rounded-lg text-center animate-pulse"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171',
            fontWeight: 600,
            letterSpacing: '0.05em',
            minWidth: '120px',
          }}
        >
          <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: 1 }}>
            Teste pendente
          </div>
          <div>{label} CD {pending.difficultyClass}</div>
        </div>
      )}

      <D20DiceCss
        result={last}
        rolling={rolling}
        onRoll={roll}
        highlight={!!pending}
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
