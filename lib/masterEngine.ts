import type { PendingTest } from './types'

type ActionType = 'join' | 'ataque' | 'investigacao' | 'percepcao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | 'sabedoria' | null

function detectActionType(message: string): ActionType {
  const lower = message.toLowerCase()

  if (/entrar na campanha|entrar com personagem|entrar na cena|usar nesta campanha/.test(lower)) {
    return 'join'
  }
  if (/atacar|ataco|golpeio|golpe|espada|arco|flecha|machado|adaga|punhal|punir|soco/.test(lower)) {
    return 'ataque'
  }
  if (/investigar|investigo|pesquisar|examinar|examino|analisar|inspecionar|vasculhar/.test(lower)) {
    return 'investigacao'
  }
  if (/procurar|procuro|observar|observo|olhar|escutar|escuto|ouvir|notar|rastrear|seguir rastro/.test(lower)) {
    return 'percepcao'
  }
  if (/convencer|convenço|negociar|intimidar|mentir|enganar|persuadir|seduzir|ameaçar|ameaço/.test(lower)) {
    return 'carisma'
  }
  if (/conversar|converso|perguntar|pergunto|falar com|falo com/.test(lower)) {
    return 'carisma'
  }
  if (/fugir|corro|correr|esquivar|esquivo|pular|saltar|esconder|escondo|desviar|me escondo|atravessar sem ser visto/.test(lower)) {
    return 'destreza'
  }
  if (/arrombar|empurrar|quebrar|levantar|puxar|forçar|empurro|puxo|resistir|segurar|derrubar/.test(lower)) {
    return 'forca'
  }
  if (/magia|feiti.?o|conjurar|conjuro|arcano|ritual|encantar|invocar|feitiço|símbolo|usar poder/.test(lower)) {
    return 'arcano'
  }
  if (/curar|curo|estabilizar|curativo|medicamento|primeiros socorros|ajudar ferido/.test(lower)) {
    return 'cura'
  }
  if (/desconfiar|desconfio|perceber mentira|pressentir|intuição|ler emoção|suspeitar/.test(lower)) {
    return 'sabedoria'
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
    ataque:      14,
    investigacao: 13,
    percepcao:   12,
    carisma:     14,
    destreza:    13,
    forca:       13,
    arcano:      15,
    cura:        12,
    sabedoria:   13,
  }

  return {
    actionType,
    requiresTest: true,
    testType: actionType === 'sabedoria' ? 'percepcao' : actionType,
    difficulty: difficultyMap[actionType as string] ?? 13
  }
}

// ── Rich outcome messages per roll type ─────────────────────────────────────

const OUTCOMES: Record<string, { crit: string; success: string; fail: string; critFail: string }> = {
  investigacao: {
    crit:     'Crítico! Você encontra mais do que esperava — um detalhe que muda tudo.',
    success:  'Sucesso. Uma pista clara emerge dos detalhes que os outros ignoraram.',
    fail:     'Falha. Os detalhes permanecem ocultos — algo escapa da sua análise.',
    critFail: 'Falha crítica! Você perturba a cena e pode ter destruído uma pista importante.',
  },
  percepcao: {
    crit:     'Crítico! Seus sentidos captam cada detalhe — nada no ambiente lhe escapa agora.',
    success:  'Sucesso. Você nota algo que não deveria estar ali.',
    fail:     'Falha. O ambiente parece normal — mas algo continua errado.',
    critFail: 'Falha crítica! Você é surpreendido. Algo ou alguém te observava enquanto você observava.',
  },
  ataque: {
    crit:     'Crítico! Um golpe devastador no ponto fraco — o inimigo hesita.',
    success:  'Acerto! Seu golpe encontra o alvo.',
    fail:     'Errou. O inimigo esquiva ou bloqueia.',
    critFail: 'Falha crítica! Seu ataque sai completamente errado — e te expõe.',
  },
  destreza: {
    crit:     'Crítico! Você se move como uma sombra — ninguém percebe nada.',
    success:  'Sucesso. Você atravessa a situação sem ser notado ou sem se machucar.',
    fail:     'Falha. Você tropeça ou faz barulho — alguém pode ter ouvido.',
    critFail: 'Falha crítica! Você é descoberto — ou pior, cai em algo perigoso.',
  },
  forca: {
    crit:     'Crítico! Força bruta absoluta — você supera o obstáculo com sobra.',
    success:  'Sucesso. O esforço físico dá resultado.',
    fail:     'Falha. O obstáculo resiste por agora.',
    critFail: 'Falha crítica! O esforço sai pela culatra — algo quebra, incluindo talvez você.',
  },
  carisma: {
    crit:     'Crítico! As palavras certas no momento certo — a pessoa acredita completamente em você.',
    success:  'Sucesso. Você convence, acalma ou intimida conforme pretendia.',
    fail:     'Falha. A pessoa não acredita em você — ou pior, fica mais desconfiada.',
    critFail: 'Falha crítica! Você insulta, ameaça demais ou diz a coisa errada — a situação piora.',
  },
  arcano: {
    crit:     'Crítico! O poder arcano flui com perfeição — a magia age além do esperado.',
    success:  'Sucesso. A energia arcana responde ao seu comando.',
    fail:     'Falha. A magia vacila — algo interfere ou falta conhecimento.',
    critFail: 'Falha crítica! A magia escapa do controle — com consequências imprevisíveis.',
  },
  cura: {
    crit:     'Crítico! A cura age com poder extraordinário — ferimentos graves se fecham.',
    success:  'Sucesso. Os ferimentos respondem ao tratamento.',
    fail:     'Falha. Os ferimentos resistem por agora.',
    critFail: 'Falha crítica! O esforço agrava a situação — você precisa de mais tempo ou recursos.',
  },
}

export function generateTestOutcomeMessage(
  roll: number,
  difficultyClass: number,
  rollType?: string
): string {
  const type = rollType ?? 'geral'
  const outcomes = OUTCOMES[type] ?? {
    crit:     'Crítico! Você supera a situação com maestria absoluta.',
    success:  'Sucesso. Sua ação alcança o objetivo.',
    fail:     'Fracasso. A situação resiste por agora.',
    critFail: 'Fracasso crítico! A situação se complica de forma inesperada.',
  }

  if (roll === 20) return outcomes.crit
  if (roll === 1)  return outcomes.critFail
  if (roll >= difficultyClass) return outcomes.success
  return outcomes.fail
}
