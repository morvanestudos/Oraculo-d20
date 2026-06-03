import type { Character } from './types'

// ── Detection patterns ────────────────────────────────────────────────────────

const HEAL_VERBS = /\b(curo|curar|cura|curando|curei|sarar|sara|estabiliz|recuper\w*\s*vida|impos\w*\s*de\s*m[ão]os|b[êe]n[çc][ão]\s*de\s*cura)\b/i
const POTION_WORDS = /\b(po[çc][aã]o|potion|bebo|tomo|tomar|beber|uso\s*po[çc][aã]o|dou\s*.*\s*po[çc][aã]o|usar\s*po[çc][aã]o|aplicar\s*po[çc][aã]o)\b/i
const KIT_WORDS = /\b(kit\s*de\s*curandeiro|kit\s*m[ée]dic|material\s*de\s*cura)\b/i
const HEAL_MINOR = /cura\s*menor|cura\s*básica|cura\s*b[áa]sic\w*/i
const SELF_WORDS = /\bme\b|\beu\s*mesmo\b|\bem\s*mim\b|\bpara\s*mim\b/i

export type HealingSource = 'potion' | 'spell_minor' | 'kit' | 'generic'

export type HealingAction = {
  isHealing: true
  targetCharacterId: string
  targetCharacterName: string
  source: HealingSource
  healingDice: string      // e.g. "1d8"
  diceSides: number
  diceCount: number
  bonus: number
  requiresRoll: boolean
  reason: string
}

export type NoHealingAction = { isHealing: false }

export type HealingResult = HealingAction | NoHealingAction

// ── Target resolution ─────────────────────────────────────────────────────────

function findTargetInMessage(
  msg: string,
  actingCharacter: Character,
  partyCharacters: Character[],
): Character | null {
  const lower = msg.toLowerCase()

  // Self-heal
  if (SELF_WORDS.test(lower) || !partyCharacters.some(c => c.id !== actingCharacter.id)) {
    return actingCharacter
  }

  // Name match among party
  const allChars = [actingCharacter, ...partyCharacters.filter(c => c.id !== actingCharacter.id)]
  for (const char of allChars) {
    if (lower.includes(char.name.toLowerCase())) return char
  }

  // Default to self if no match
  return actingCharacter
}

function resolveSource(msg: string): HealingSource {
  if (POTION_WORDS.test(msg)) return 'potion'
  if (HEAL_MINOR.test(msg))   return 'spell_minor'
  if (KIT_WORDS.test(msg))    return 'kit'
  return 'generic'
}

function healingParams(source: HealingSource, casterWisdom = 10): { diceCount: number; diceSides: number; bonus: number; requiresRoll: boolean } {
  const wisBonus = Math.floor((casterWisdom - 10) / 2)
  switch (source) {
    case 'potion':      return { diceCount: 1, diceSides: 8, bonus: 2,          requiresRoll: false }
    case 'spell_minor': return { diceCount: 1, diceSides: 6, bonus: wisBonus,   requiresRoll: false }
    case 'kit':         return { diceCount: 1, diceSides: 4, bonus: wisBonus,   requiresRoll: true  }
    default:            return { diceCount: 1, diceSides: 6, bonus: 1,          requiresRoll: false }
  }
}

// ── Main detector ─────────────────────────────────────────────────────────────

export function detectHealingAction(
  message: string,
  actingCharacter: Character | null | undefined,
  partyCharacters: Character[],
): HealingResult {
  if (!actingCharacter) return { isHealing: false }
  if (!HEAL_VERBS.test(message) && !POTION_WORDS.test(message) && !KIT_WORDS.test(message)) {
    return { isHealing: false }
  }

  const source  = resolveSource(message)
  const target  = findTargetInMessage(message, actingCharacter, partyCharacters)
  if (!target) return { isHealing: false }

  const casterWisdom = actingCharacter.attributes.wis
  const { diceCount, diceSides, bonus, requiresRoll } = healingParams(source, casterWisdom)

  return {
    isHealing: true,
    targetCharacterId:   target.id,
    targetCharacterName: target.name,
    source,
    healingDice: `${diceCount}d${diceSides}`,
    diceCount,
    diceSides,
    bonus,
    requiresRoll,
    reason: sourceLabel(source),
  }
}

// ── Calculation ───────────────────────────────────────────────────────────────

export function rollHealing(diceCount: number, diceSides: number, bonus: number): {
  rolls: number[]; total: number
} {
  const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1)
  return { rolls, total: Math.max(1, rolls.reduce((a, b) => a + b, 0) + bonus) }
}

export function applyHeal(currentHp: number, amount: number, maxHp: number): number {
  return Math.min(maxHp, currentHp + amount)
}

// ── Chat formatter ────────────────────────────────────────────────────────────

export function formatHealMessage(params: {
  healerName: string
  targetName: string
  source: HealingSource
  rolls: number[]
  bonus: number
  totalHealed: number
  previousHp: number
  newHp: number
  maxHp: number
}): string {
  const { healerName, targetName, source, rolls, bonus, totalHealed, previousHp, newHp, maxHp } = params
  const rollStr = rolls.length ? `[${rolls.join('+')}]${bonus !== 0 ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : ''}` : `${totalHealed}`
  const overflow = newHp === maxHp && previousHp < maxHp && totalHealed > (maxHp - previousHp)
    ? '\n⚠️ Parte da cura se perde — HP já no máximo.' : ''

  return [
    `💚 Cura aplicada`,
    `Alvo: ${targetName}${healerName !== targetName ? `  |  Curador: ${healerName}` : ''}`,
    `Fonte: ${sourceLabel(source)}`,
    `Rolagem: ${rollStr} = **${totalHealed}**`,
    `HP: ${previousHp}/${maxHp} → ${newHp}/${maxHp}${overflow}`,
  ].join('\n')
}

function sourceLabel(source: HealingSource): string {
  switch (source) {
    case 'potion':      return 'Poção comum'
    case 'spell_minor': return 'Cura Menor'
    case 'kit':         return 'Kit de Curandeiro'
    default:            return 'Cura'
  }
}
