import type { PendingTest } from './types'

type ActionType = 'join' | 'ataque' | 'investigacao' | 'percepcao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | null

function detectActionType(message: string): ActionType {
  const lower = message.toLowerCase()

  if (/entrar na campanha|entrar com personagem|entrar na cena|usar nesta campanha/.test(lower)) {
    return 'join'
  }
  if (/atacar|ataco|golpeio|golpe|espada|arco|flecha|machado|adaga|punir|socco|soco/.test(lower)) {
    return 'ataque'
  }
  if (/investigar|investigo|pesquisar|examinar|examino|analisar|inspecionar/.test(lower)) {
    return 'investigacao'
  }
  if (/procurar|procuro|observar|observo|olhar|escutar|escuto|ver|notar/.test(lower)) {
    return 'percepcao'
  }
  if (/convencer|convenço|conversar|converso|perguntar|pergunto|negociar|intimidar|mentir|falar/.test(lower)) {
    return 'carisma'
  }
  if (/fugir|corro|correr|esquivar|esquivo|pular|saltar|esconder|escondo|desviar/.test(lower)) {
    return 'destreza'
  }
  if (/arrombar|empurrar|quebrar|levantar|puxar|forçar|força|empurro|puxo/.test(lower)) {
    return 'forca'
  }
  if (/magia|feiti.?o|conjurar|conjuro|arcano|ritual|encantar|invocar|feitiço/.test(lower)) {
    return 'arcano'
  }
  if (/curar|curo|ajudar|ajudo|estabilizar|curativo|medicamento/.test(lower)) {
    return 'cura'
  }

  return null
}

export type ActionResult = {
  actionType: ActionType
  requiresTest: boolean
  testType?: string
  difficulty?: number
}

export function analyzeAction(playerMessage: string): ActionResult {
  const actionType = detectActionType(playerMessage)

  if (!actionType || actionType === 'join') {
    return { actionType, requiresTest: false }
  }

  const difficultyMap: Record<string, number> = {
    ataque: 15,
    investigacao: 14,
    percepcao: 14,
    carisma: 14,
    destreza: 13,
    forca: 14,
    arcano: 15,
    cura: 13
  }

  return {
    actionType,
    requiresTest: true,
    testType: actionType,
    difficulty: difficultyMap[actionType as string] ?? 14
  }
}

export function generateTestOutcomeMessage(roll: number, difficultyClass: number): string {
  if (roll === 20) {
    return 'Sucesso espetacular! Você supera a situação com maestria absoluta.'
  }

  if (roll === 1) {
    return 'Fracasso crítico! A situação se complica de forma inesperada.'
  }

  if (roll >= difficultyClass) {
    return 'Sucesso! Sua ação alcança o objetivo.'
  }

  return 'Fracasso. Você precisa tentar novamente enquanto a tensão aumenta.'
}
