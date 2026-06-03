import type { CampaignMemory } from './types'

export type CampaignAct = {
  number: number
  title: string
  subtitle: string
  description: string
  announceFlag: string
}

const TAVERNA_ACTS: CampaignAct[] = [
  {
    number: 1,
    title: 'Ato I',
    subtitle: 'Chegada a Valdrak',
    description: 'Os aventureiros chegam à vila e ouvem os primeiros rumores sobre desaparecimentos.',
    announceFlag: 'act_1_announced',
  },
  {
    number: 2,
    title: 'Ato II',
    subtitle: 'Ecos na Floresta',
    description: 'Pistas levam o grupo para além da segurança da taverna, onde cantos estranhos ecoam entre as árvores.',
    announceFlag: 'act_2_announced',
  },
  {
    number: 3,
    title: 'Ato III',
    subtitle: 'O Culto dos Corvos',
    description: 'Símbolos ocultos, moradores assustados e segredos antigos revelam a presença de uma seita esquecida.',
    announceFlag: 'act_3_announced',
  },
  {
    number: 4,
    title: 'Ato IV',
    subtitle: 'O Ritual da Meia-Noite',
    description: 'O grupo descobre que os desaparecidos fazem parte de um ritual prestes a ser concluído.',
    announceFlag: 'act_4_announced',
  },
  {
    number: 5,
    title: 'Ato V',
    subtitle: 'As Asas na Escuridão',
    description: 'A verdade surge nas sombras, e os aventureiros precisam enfrentar a criatura por trás dos desaparecimentos.',
    announceFlag: 'act_5_announced',
  },
]

const GENERIC_ACTS: CampaignAct[] = [
  {
    number: 1,
    title: 'Ato I',
    subtitle: 'O Começo',
    description: 'Os aventureiros chegam e encontram os primeiros sinais de algo errado.',
    announceFlag: 'act_1_announced',
  },
  {
    number: 2,
    title: 'Ato II',
    subtitle: 'A Investigação',
    description: 'Pistas e encontros revelam a extensão do perigo.',
    announceFlag: 'act_2_announced',
  },
  {
    number: 3,
    title: 'Ato III',
    subtitle: 'Segredos Revelados',
    description: 'A verdade começa a emergir das sombras.',
    announceFlag: 'act_3_announced',
  },
  {
    number: 4,
    title: 'Ato IV',
    subtitle: 'O Ponto de Virada',
    description: 'Escolhas difíceis e consequências irreversíveis.',
    announceFlag: 'act_4_announced',
  },
  {
    number: 5,
    title: 'Ato V',
    subtitle: 'O Confronto Final',
    description: 'O clímax da aventura — vitória ou derrota.',
    announceFlag: 'act_5_announced',
  },
]

export function getCampaignActs(campaignTitle?: string): CampaignAct[] {
  return (campaignTitle ?? '').toLowerCase().includes('taverna')
    ? TAVERNA_ACTS
    : GENERIC_ACTS
}

export function detectCampaignAct(campaignTitle: string | undefined, memory: CampaignMemory | null): number {
  if (!memory) return 1

  const flags = memory.storyFlags ?? {}
  const location = (memory.currentLocation ?? '').toLowerCase()
  const threat = (memory.currentThreat ?? '').toLowerCase()
  const objective = (memory.currentObjective ?? '').toLowerCase()
  const clues = (memory.discoveredClues ?? []).map(c => c.toLowerCase()).join(' ')
  const tension = memory.tensionLevel ?? 1

  if (
    flags['ato5_iniciado'] ||
    flags['boss_revelado'] ||
    tension >= 9 ||
    /criatura final|entidade|boss|asas|escurid/.test(threat)
  ) return 5

  if (
    flags['ato4_iniciado'] ||
    flags['ritual_descoberto'] ||
    tension >= 7 ||
    /ritual|meia.noite|sacrif/.test(threat + objective + clues)
  ) return 4

  if (
    flags['ato3_iniciado'] ||
    flags['culto_revelado'] ||
    /culto|seita|s[íi]mbolo|corvos/.test(clues + objective + threat)
  ) return 3

  if (
    flags['ato2_iniciado'] ||
    /floresta|mata|bosque|árvore|trilha/.test(location + objective)
  ) return 2

  return 1
}
