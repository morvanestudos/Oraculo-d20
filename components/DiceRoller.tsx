"use client"
import React, { useState } from 'react'
import D20DiceCss from './D20DiceCss'
import { saveMessage, getPendingTest, clearPendingTest, getCombatState, saveCombatState, clearCombatState, getActiveCharacter } from '../lib/storage'
import { createMessage } from '../lib/api/messages'
import { generateTestOutcomeMessage } from '../lib/masterEngine'
import type { CombatState } from '../lib/types'
import type { Message } from '../lib/types'

type DiceRollerProps = {
  campaignId: string
}

export default function DiceRoller({ campaignId }: DiceRollerProps) {
  const [last, setLast] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)

  function roll() {
    setRolling(true)
    const v = Math.floor(Math.random() * 20) + 1
    setTimeout(async () => {
      setLast(v)
      setRolling(false)
      console.log('DiceRoller: rolagem d20:', v)
      const tempSystemMessage: Message = {
        id: `temp-${Date.now()}`,
        campaignId,
        author: 'Sistema',
        role: 'system',
        content: `Rolagem d20: ${v}`,
        createdAt: new Date().toISOString()
      }
      setLast(v)
      saveMessage(tempSystemMessage)
      const createdSystemMessage = await createMessage(campaignId, {
        author: tempSystemMessage.author,
        role: tempSystemMessage.role,
        content: tempSystemMessage.content
      })
      const systemMessage = createdSystemMessage ?? tempSystemMessage
      if (createdSystemMessage) {
        saveMessage(createdSystemMessage)
      }

      const pendingTest = getPendingTest(campaignId)
      if (pendingTest) {
        console.log('DiceRoller: pendingTest encontrado:', pendingTest)

        if (pendingTest.type === 'ataque') {
          const combat = getCombatState(campaignId) as CombatState | null
          if (combat) {
            const enemy = combat.combatants.find(c => c.type === 'enemy' && c.hp > 0)
            const player = combat.combatants.find(c => c.type === 'player')

            let attackText = ''

            if (!enemy) {
              attackText = 'Não há inimigos válidos para atacar.'
            } else {
              if (v === 20) {
                const base = Math.floor(Math.random() * 8) + 1 + 2
                const dmg = base * 2
                enemy.hp = Math.max(0, enemy.hp - dmg)
                attackText = `Acerto crítico! Você causa ${dmg} de dano em ${enemy.name}.`
              } else if (v === 1) {
                attackText = 'Falha crítica! Seu ataque sai terrivelmente errado.'
              } else if (v >= enemy.armorClass) {
                const dmg = Math.floor(Math.random() * 8) + 1 + 2
                enemy.hp = Math.max(0, enemy.hp - dmg)
                attackText = `Acertou ${enemy.name} e causou ${dmg} de dano.`
              } else {
                attackText = `Seu ataque erra ${enemy.name}.`
              }

              const logEntry = {
                id: `log-${Date.now()}`,
                combatId: combat.id,
                text: `Jogador ataca: ${attackText}`,
                createdAt: new Date().toISOString()
              }
              combat.logs = [...combat.logs, logEntry]
              saveCombatState(combat)

              const atkPayload = {
                author: 'Mestre IA',
                role: 'master' as const,
                content: `Teste de ${pendingTest.reason} (CD ${pendingTest.difficultyClass}) resultou em ${v}. ${attackText}`
              }
              const atkMessage = await createMessage(campaignId, atkPayload)
              if (atkMessage) {
                saveMessage(atkMessage)
              } else {
                saveMessage({
                  id: `temp-${Date.now()}-attack`,
                  campaignId,
                  author: atkPayload.author,
                  role: atkPayload.role,
                  content: atkPayload.content,
                  createdAt: new Date().toISOString()
                })
              }

              if (enemy.hp <= 0) {
                const winPayload = {
                  author: 'Mestre IA',
                  role: 'master' as const,
                  content: `${enemy.name} foi derrotado! Você vence o combate.`
                }
                const winMessage = await createMessage(campaignId, winPayload)
                if (winMessage) {
                  saveMessage(winMessage)
                } else {
                  saveMessage({
                    id: `temp-${Date.now()}-win`,
                    campaignId,
                    author: winPayload.author,
                    role: winPayload.role,
                    content: winPayload.content,
                    createdAt: new Date().toISOString()
                  })
                }
                clearCombatState(campaignId)
                clearPendingTest(campaignId)
                return
              }

              if (player) {
                const enemyRoll = Math.floor(Math.random() * 20) + 1
                let enemyText = ''
                if (enemyRoll === 20) {
                  const dmg = (Math.floor(Math.random() * 6) + 1 + 1) * 2
                  player.hp = Math.max(0, player.hp - dmg)
                  enemyText = `${enemy.name} acerta um crítico e causa ${dmg} de dano em ${player.name}.`
                } else if (enemyRoll === 1) {
                  enemyText = `${enemy.name} falha miseravelmente.`
                } else if (enemyRoll >= player.armorClass) {
                  const dmg = Math.floor(Math.random() * 6) + 1 + 1
                  player.hp = Math.max(0, player.hp - dmg)
                  enemyText = `${enemy.name} ataca e causa ${dmg} de dano em ${player.name}.`
                } else {
                  enemyText = `${enemy.name} erra o ataque em ${player.name}.`
                }

                const elog = {
                  id: `log-${Date.now()}-e`,
                  combatId: combat.id,
                  text: `Inimigo: ${enemyText}`,
                  createdAt: new Date().toISOString()
                }
                combat.logs = [...combat.logs, elog]
                saveCombatState(combat)

                const enemyPayload = {
                  author: 'Mestre IA',
                  role: 'master' as const,
                  content: enemyText
                }
                const enemyMsg = await createMessage(campaignId, enemyPayload)
                if (enemyMsg) {
                  saveMessage(enemyMsg)
                } else {
                  saveMessage({
                    id: `temp-${Date.now()}-enemy`,
                    campaignId,
                    author: enemyPayload.author,
                    role: enemyPayload.role,
                    content: enemyPayload.content,
                    createdAt: new Date().toISOString()
                  })
                }

                if (player.hp <= 0) {
                  const deathPayload = {
                    author: 'Mestre IA',
                    role: 'master' as const,
                    content: `${player.name} cai em combate...`
                  }
                  const deathMsg = await createMessage(campaignId, deathPayload)
                  if (deathMsg) {
                    saveMessage(deathMsg)
                  } else {
                    saveMessage({
                      id: `temp-${Date.now()}-death`,
                      campaignId,
                      author: deathPayload.author,
                      role: deathPayload.role,
                      content: deathPayload.content,
                      createdAt: new Date().toISOString()
                    })
                  }
                  clearCombatState(campaignId)
                  clearPendingTest(campaignId)
                  return
                }

                saveCombatState(combat)
              }
            }
            clearPendingTest(campaignId)
            return
          }
        }

        const outcome = generateTestOutcomeMessage(v, pendingTest.difficultyClass)
        const rollPayload = {
          author: 'Mestre IA',
          role: 'master' as const,
          content: `Teste de ${pendingTest.reason} (CD ${pendingTest.difficultyClass}) resultou em ${v}. ${outcome}`
        }
        const resultMessage = await createMessage(campaignId, rollPayload)
        if (resultMessage) {
          saveMessage(resultMessage)
        } else {
          saveMessage({
            id: `temp-${Date.now()}-roll`,
            campaignId,
            author: rollPayload.author,
            role: rollPayload.role,
            content: rollPayload.content,
            createdAt: new Date().toISOString()
          })
        }
        clearPendingTest(campaignId)
      } else {
        console.log('DiceRoller: sem pendingTest para campanha', campaignId)
      }
    }, 700)
  }

  return (
    <D20DiceCss result={last} rolling={rolling} onRoll={roll} />
  )
}
