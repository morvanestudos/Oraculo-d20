// ── Dice roller ───────────────────────────────────────────────────────────────

export type DamageRoll = {
  diceRolls: number[]
  bonus: number
  totalDamage: number
  formula: string
  critical: boolean
}

/** Roll Nd sides and return results */
function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
}

/** Roll damage: e.g. rollDamage(1, 8, 2) = 1d8+2 */
export function rollDamage(
  diceCount: number,
  diceSides: number,
  bonus = 0,
  critical = false
): DamageRoll {
  const rolls = rollDice(critical ? diceCount * 2 : diceCount, diceSides)
  const total = rolls.reduce((a, b) => a + b, 0) + bonus
  const formula = `${critical ? diceCount * 2 : diceCount}d${diceSides}${bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : ''}`
  return {
    diceRolls: rolls,
    bonus,
    totalDamage: Math.max(1, total),  // minimum 1 damage on a hit
    formula,
    critical,
  }
}

// ── Weapon presets ────────────────────────────────────────────────────────────

type AttackDamageInput = {
  weaponType?: 'standard' | 'heavy' | 'light' | 'ranged'
  strBonus?: number
  critical?: boolean
}

/**
 * Calculate attack damage for a player character.
 * standard → 1d8 + strBonus
 * heavy    → 1d10 + strBonus
 * light    → 1d6 + strBonus
 * ranged   → 1d6 + dexBonus (caller passes correct bonus)
 */
export function calculateAttackDamage(input: AttackDamageInput = {}): DamageRoll {
  const { weaponType = 'standard', strBonus = 0, critical = false } = input
  switch (weaponType) {
    case 'heavy':  return rollDamage(1, 10, Math.max(0, Math.floor(strBonus / 4)), critical)
    case 'light':  return rollDamage(1, 6,  Math.max(0, Math.floor(strBonus / 4)), critical)
    case 'ranged': return rollDamage(1, 6,  Math.max(0, Math.floor(strBonus / 4)), critical)
    default:       return rollDamage(1, 8,  Math.max(0, Math.floor(strBonus / 4)), critical)
  }
}

/** Generic enemy damage: 1d6 + 1 */
export function calculateEnemyDamage(critical = false): DamageRoll {
  return rollDamage(1, 6, 1, critical)
}

// ── HP helpers ────────────────────────────────────────────────────────────────

/** Clamp HP to [0, maxHp]. If maxHp is unknown, clamp only to 0. */
export function applyDamage(currentHp: number, damage: number, maxHp?: number): number {
  const newHp = Math.max(0, currentHp - damage)
  return maxHp != null ? Math.min(maxHp, newHp) : newHp
}

export function applyHeal(currentHp: number, amount: number, maxHp: number): number {
  return Math.min(maxHp, currentHp + amount)
}

// ── Chat message formatters ───────────────────────────────────────────────────

export function formatDamageMessage(params: {
  attackerName: string
  targetName: string
  damageRoll: DamageRoll
  previousHp: number
  newHp: number
  isPlayer: boolean
}): string {
  const { attackerName, targetName, damageRoll, previousHp, newHp, isPlayer } = params
  const icon = isPlayer ? '🗡️' : '💥'
  const { formula, diceRolls, bonus, totalDamage, critical } = damageRoll
  const rollStr = `[${diceRolls.join('+')}]${bonus > 0 ? `+${bonus}` : ''}`

  return [
    `${icon} ${critical ? '🌟 Acerto crítico! ' : ''}${attackerName} acerta ${targetName}!`,
    `Dano: ${formula}  →  ${rollStr} = **${totalDamage}**`,
    `HP de ${targetName}: ${previousHp} → ${newHp}${newHp === 0 ? ' ☠️' : ''}`,
  ].join('\n')
}

export function formatMissMessage(attackerName: string, targetName: string): string {
  return `❌ ${attackerName} erra o ataque. A lâmina corta apenas o ar.`
}

export function formatEnemyMissMessage(enemyName: string, playerName: string): string {
  return `🛡️ ${enemyName} erra o contra-ataque em ${playerName}.`
}
