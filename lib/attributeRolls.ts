import type { Character } from './types'

// ── Attribute key mapped to roll type ────────────────────────────────────────

type AttributeKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

const ROLL_TYPE_TO_ATTRIBUTE: Record<string, AttributeKey> = {
  ataque:       'strength',
  investigacao: 'intelligence',
  percepcao:    'wisdom',
  carisma:      'charisma',
  destreza:     'dexterity',
  forca:        'strength',
  arcano:       'intelligence',
  sabedoria:    'wisdom',
  cura:         'wisdom',
  geral:        'strength',   // generic — weakest bonus
}

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength:     'Força',
  dexterity:    'Destreza',
  constitution: 'Constituição',
  intelligence: 'Inteligência',
  wisdom:       'Sabedoria',
  charisma:     'Carisma',
}

// ── Internal attr key → Character.attributes key ─────────────────────────────

const ATTR_TO_CHAR_KEY: Record<AttributeKey, keyof Character['attributes']> = {
  strength:     'str',
  dexterity:    'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom:       'wis',
  charisma:     'cha',
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAttributeForRollType(rollType: string): AttributeKey {
  return ROLL_TYPE_TO_ATTRIBUTE[rollType] ?? 'strength'
}

export function getAttributeLabel(attributeKey: AttributeKey | string): string {
  return ATTRIBUTE_LABELS[attributeKey as AttributeKey] ?? attributeKey
}

export function getCharacterAttributeValue(
  character: Character | null | undefined,
  attributeKey: AttributeKey | string
): number {
  if (!character) return 0
  const charKey = ATTR_TO_CHAR_KEY[attributeKey as AttributeKey]
  if (!charKey) return 0
  return character.attributes[charKey] ?? 0
}

export type RollBreakdown = {
  d20: number
  attributeKey: AttributeKey | string
  attributeLabel: string
  attributeValue: number
  total: number
  isCriticalSuccess: boolean
  isCriticalFail: boolean
}

export function calculateRollTotal({
  d20,
  rollType,
  character,
}: {
  d20: number
  rollType: string
  character: Character | null | undefined
}): RollBreakdown {
  const attributeKey   = getAttributeForRollType(rollType)
  const attributeLabel = getAttributeLabel(attributeKey)
  const attributeValue = getCharacterAttributeValue(character, attributeKey)

  return {
    d20,
    attributeKey,
    attributeLabel,
    attributeValue,
    total: d20 + attributeValue,
    isCriticalSuccess: d20 === 20,
    isCriticalFail:    d20 === 1,
  }
}

// ── Format roll message for chat ──────────────────────────────────────────────

export function formatRollMessage(
  breakdown: RollBreakdown,
  difficultyClass: number,
  outcome: string,
  noCharacter = false
): string {
  const { d20, attributeLabel, attributeValue, total, isCriticalSuccess, isCriticalFail } = breakdown

  let resultIcon: string
  if (isCriticalSuccess)   resultIcon = '🌟 Sucesso Crítico!'
  else if (isCriticalFail) resultIcon = '💀 Falha Crítica!'
  else if (total >= difficultyClass) resultIcon = '✅ Sucesso'
  else                               resultIcon = '❌ Falha'

  const lines = [
    `🎲 Teste de ${attributeLabel}`,
    `D20: ${d20}`,
    attributeValue > 0
      ? `${attributeLabel}: +${attributeValue}`
      : attributeValue < 0
      ? `${attributeLabel}: ${attributeValue}`
      : (noCharacter ? '⚠️ Sem personagem ativo — atributo não somado' : `${attributeLabel}: +0`),
    `Total: ${total}  |  CD: ${difficultyClass}`,
    '',
    resultIcon,
  ]

  if (!isCriticalSuccess && !isCriticalFail) {
    lines.push(outcome)
  }

  return lines.join('\n')
}
