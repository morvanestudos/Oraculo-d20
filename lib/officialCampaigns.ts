import type { ActiveNPC, Npc, QuestCreateDTO } from './types'

export type OfficialCampaignKey = 'taverna' | 'aurora'

export type OfficialCampaignDefinition = {
  key: OfficialCampaignKey
  title: string
  description: string
  theme: string
  level: number
  maxPlayers: number
  initialMemory: {
    currentScene: string
    currentLocation: string
    currentObjective: string
    currentThreat: string
    tensionLevel: number
    discoveredClues: string[]
    activeNPCs: ActiveNPC[]
    activeEnemies: string[]
    storyFlags: Record<string, boolean>
    turnCount: number
    lastPlayerAction: string
    lastMasterAction: string
    summary: string
  }
  mainQuest: QuestCreateDTO
  initialQuests: QuestCreateDTO[]
  initialNpcs: Omit<Npc, 'id' | 'campaignId' | 'active'>[]
  intro: string
  initialMessage: string
  fallbackObjectives: string[]
}

export const TAVERNA_CAMPAIGN: OfficialCampaignDefinition = {
  key: 'taverna',
  title: 'A Taverna dos Corvos',
  description:
    'Jogadores chegam em uma vila isolada onde moradores desaparecem durante a noite. Rumores falam de um antigo culto escondido na floresta ao redor da vila.',
  theme: 'Mistério, investigação, horror medieval e fantasia sombria',
  level: 1,
  maxPlayers: 6,
  initialMemory: {
    currentScene: 'Chegada à vila de Valdrak',
    currentLocation: 'Taverna dos Corvos',
    currentObjective: 'Investigar os desaparecimentos na vila',
    currentThreat: 'Um culto oculto age durante a noite',
    tensionLevel: 3,
    discoveredClues: [],
    activeNPCs: [
      {
        name: 'Brós, o Taverneiro',
        role: 'informante',
        mood: 'desconfiado e desesperado',
        knownInfo: 'perdeu um funcionário nos desaparecimentos, ouviu cantos na floresta',
      },
    ],
    activeEnemies: [],
    storyFlags: { officialCampaign: true, taverna_campaign: true, act_1_unlocked: true },
    turnCount: 0,
    lastPlayerAction: '',
    lastMasterAction: '',
    summary:
      'Os aventureiros chegam à vila de Valdrak, onde moradores desaparecem misteriosamente durante a madrugada.',
  },
  mainQuest: {
    title: 'Os Desaparecidos de Valdrak',
    description: 'Moradores somem sob a chuva, e cada pista aponta para a floresta além da Taverna dos Corvos.',
    status: 'active',
    questType: 'main',
    reward: '100 XP',
    priority: 100,
    objectiveList: [
      { id: 'talk_arvik', label: 'Conversar com Arvik, o taverneiro', status: 'active', completedAt: null },
      { id: 'talk_elenna', label: 'Falar com Elenna, a viúva', status: 'active', completedAt: null },
      { id: 'inspect_back_door', label: 'Investigar a porta dos fundos', status: 'active', completedAt: null },
      { id: 'find_forest_tracks', label: 'Encontrar rastros rumo à floresta', status: 'active', completedAt: null },
      { id: 'discover_abductor', label: 'Descobrir quem está levando os moradores', status: 'active', completedAt: null },
    ],
    objectives: [
      { id: 'talk_arvik', label: 'Conversar com Arvik, o taverneiro', status: 'active', done: false },
      { id: 'talk_elenna', label: 'Falar com Elenna, a viúva', status: 'active', done: false },
      { id: 'inspect_back_door', label: 'Investigar a porta dos fundos', status: 'active', done: false },
      { id: 'find_forest_tracks', label: 'Encontrar rastros rumo à floresta', status: 'active', done: false },
      { id: 'discover_abductor', label: 'Descobrir quem está levando os moradores', status: 'active', done: false },
    ],
  },
  initialQuests: [
    {
      title: 'Investigar os desaparecimentos',
      description:
        'Moradores de Valdrak somem sem rastro durante a madrugada. Descubra quem está por trás disso antes que alguém mais desapareça.',
      status: 'active',
      reward: '50 po + reputação em Valdrak',
    },
    {
      title: 'Conversar com o taverneiro',
      description:
        'Brós sabe mais do que aparenta. Ganhe sua confiança para obter informações cruciais sobre os eventos recentes.',
      status: 'active',
      reward: 'Informações valiosas e abrigo gratuito',
    },
    {
      title: 'Explorar a floresta ao norte',
      description: 'Todos os rumores apontam para a floresta densa ao norte. Algo ou alguém mora lá.',
      status: 'active',
      reward: '30 po + pistas sobre o culto',
    },
    {
      title: 'Descobrir a origem dos cantos',
      description:
        'Moradores relatam ouvir cantos estranhos durante a madrugada vindos da floresta. Descubra o que são.',
      status: 'active',
      reward: 'Revelação sobre o culto oculto',
    },
    {
      title: 'Encontrar o culto oculto',
      description:
        'Um culto antigo opera nas profundezas da floresta. Encontre-os, descubra seus planos e ponha um fim nisso.',
      status: 'active',
      reward: '200 po + item mágico + salvação de Valdrak',
    },
  ],
  initialNpcs: [
    {
      name: 'Arvik, o Taverneiro',
      role: 'Dono da Taverna dos Corvos',
      mood: 'desconfiado',
      trust: -1,
      fear: 3,
      knownInfo: 'Ouviu cantos vindos da floresta ao norte nas noites de desaparecimento.',
      secrets: 'Viu um símbolo gravado na porta dos fundos, mas não contou a ninguém.',
    },
    {
      name: 'Elenna, a Viúva',
      role: 'Moradora da vila',
      mood: 'desesperado',
      trust: 2,
      fear: 8,
      knownInfo: 'Seu marido desapareceu perto do poço antigo há três noites.',
      secrets: 'Encontrou um pedaço de tecido com o símbolo do culto no bolso do marido antes do sumiço.',
    },
    {
      name: 'Irmã Maera',
      role: 'Guardiã da Capela',
      mood: 'misterioso',
      trust: 0,
      fear: 4,
      knownInfo: 'Diz que os desaparecimentos seguem um padrão lunar antigo.',
      secrets: 'Tem um grimório que descreve o ritual, mas acredita ser ficção.',
    },
    {
      name: 'Varek, o Caçador',
      role: 'Rastreador da vila',
      mood: 'ansioso',
      trust: 1,
      fear: 5,
      knownInfo: 'Encontrou pegadas que desaparecem abruptamente na beira da floresta.',
      secrets: 'Viu luzes se movendo na floresta na noite passada e fugiu sem investigar.',
    },
  ],
  intro:
    'Uma chuva fina cobre os telhados tortos da vila de Valdrak. Na velha Taverna dos Corvos, viajantes cochicham sobre desaparecimentos durante a madrugada. Entre o som da chuva e o ranger da madeira, algo observa do lado de fora.',
  initialMessage:
    'A porta da Taverna dos Corvos range quando vocês entram. O salão silencia por um instante. O taverneiro observa por trás do balcão, enquanto a chuva bate contra as janelas. Algo nesta vila está profundamente errado. O que vocês fazem?',
  fallbackObjectives: [
    'Investigar os desaparecimentos',
    'Conversar com o taverneiro',
    'Explorar a floresta ao norte',
    'Descobrir a origem dos cantos',
    'Encontrar o culto oculto',
  ],
}

export const AURORA_CAMPAIGN: OfficialCampaignDefinition = {
  key: 'aurora',
  title: 'Elyndria: Os Esquecidos de Aurora',
  description:
    'Aurora, a Cidade das Mil Oportunidades, é o maior centro comercial de Elyndria. Pessoas estão desaparecendo e, de forma impossível, todos esquecem que elas existiram. Familiares esquecem, documentos somem, retratos mudam. Uma força antiga apaga pessoas da própria realidade, e os heróis são os únicos capazes de perceber.',
  theme: 'Fantasia medieval épica, mistério, exploração, guildas, política, aventura, combate, tesouros e intrigas',
  level: 1,
  maxPlayers: 6,
  initialMemory: {
    currentScene: 'Chegada à Cidade de Aurora',
    currentLocation: 'O Grifo Dourado, Distrito dos Aventureiros de Aurora',
    currentObjective: 'Investigar o desaparecimento do mercador Eldric',
    currentThreat: 'Uma força antiga apaga pessoas da própria realidade',
    tensionLevel: 3,
    discoveredClues: ['O nome Eldric ainda soa familiar para os heróis, embora ninguém mais pareça reconhecê-lo.'],
    activeNPCs: [
      {
        name: 'Arvik',
        role: 'taverneiro do Grifo Dourado',
        mood: 'pragmático e alerta',
        knownInfo: 'lembra de pessoas que todos esqueceram',
      },
      {
        name: 'Elenna',
        role: 'bibliotecária arcana',
        mood: 'curiosa',
        knownInfo: 'possui livros que mudam sozinhos',
      },
    ],
    activeEnemies: [],
    storyFlags: { officialCampaign: true, aurora_campaign: true, act_1_unlocked: true },
    turnCount: 0,
    lastPlayerAction: '',
    lastMasterAction: '',
    summary:
      'Os heróis começam no Grifo Dourado, em Aurora, onde o sumiço do mercador Eldric revela que pessoas estão sendo apagadas da memória e dos registros da cidade.',
  },
  mainQuest: {
    title: 'Os Esquecidos de Aurora',
    description:
      'Investigue o desaparecimento do mercador Eldric e descubra quem está apagando pessoas da própria realidade em Aurora.',
    status: 'active',
    questType: 'main',
    reward: '100 XP',
    priority: 100,
    objectiveList: [
      { id: 'investigate_eldric', label: 'Investigar o desaparecimento do mercador Eldric', status: 'active', completedAt: null },
      { id: 'prove_memory_erasure', label: 'Descobrir por que ninguém se lembra dele', status: 'active', completedAt: null },
      { id: 'find_lost_records', label: 'Encontrar registros perdidos', status: 'active', completedAt: null },
      { id: 'identify_erasing_force', label: 'Identificar quem está apagando pessoas', status: 'active', completedAt: null },
      { id: 'discover_nameless_king', label: 'Descobrir a verdade sobre o Rei Sem Nome', status: 'active', completedAt: null },
    ],
    objectives: [
      { id: 'investigate_eldric', label: 'Investigar o desaparecimento do mercador Eldric', status: 'active', done: false },
      { id: 'prove_memory_erasure', label: 'Descobrir por que ninguém se lembra dele', status: 'active', done: false },
      { id: 'find_lost_records', label: 'Encontrar registros perdidos', status: 'active', done: false },
      { id: 'identify_erasing_force', label: 'Identificar quem está apagando pessoas', status: 'active', done: false },
      { id: 'discover_nameless_king', label: 'Descobrir a verdade sobre o Rei Sem Nome', status: 'active', done: false },
    ],
  },
  initialQuests: [
    {
      title: 'Os Esquecidos de Aurora',
      description:
        'Investigue o desaparecimento do mercador Eldric e descubra quem está apagando pessoas da própria realidade em Aurora.',
      status: 'active',
      questType: 'main',
      reward: '100 XP',
      priority: 100,
      objectiveList: [
        { id: 'investigate_eldric', label: 'Investigar o desaparecimento do mercador Eldric', status: 'active', completedAt: null },
        { id: 'prove_memory_erasure', label: 'Descobrir por que ninguém se lembra dele', status: 'active', completedAt: null },
        { id: 'find_lost_records', label: 'Encontrar registros perdidos', status: 'active', completedAt: null },
        { id: 'identify_erasing_force', label: 'Identificar quem está apagando pessoas', status: 'active', completedAt: null },
        { id: 'discover_nameless_king', label: 'Descobrir a verdade sobre o Rei Sem Nome', status: 'active', completedAt: null },
      ],
      objectives: [
        { id: 'investigate_eldric', label: 'Investigar o desaparecimento do mercador Eldric', status: 'active', done: false },
        { id: 'prove_memory_erasure', label: 'Descobrir por que ninguém se lembra dele', status: 'active', done: false },
        { id: 'find_lost_records', label: 'Encontrar registros perdidos', status: 'active', done: false },
        { id: 'identify_erasing_force', label: 'Identificar quem está apagando pessoas', status: 'active', done: false },
        { id: 'discover_nameless_king', label: 'Descobrir a verdade sobre o Rei Sem Nome', status: 'active', done: false },
      ],
    },
    {
      title: 'O Livro que Reescreve a Si Mesmo',
      description: 'Ganhe a confiança de Elenna para investigar volumes da Biblioteca Arcana que mudam quando ninguém observa.',
      status: 'inactive',
      questType: 'secondary',
      branchKey: 'elenna_trust',
      reward: 'Acesso a registros alterados sobre Eldric',
      priority: 60,
    },
    {
      title: 'O Homem Sem Rosto',
      description: 'Siga relatos contraditórios sobre uma figura que permanece em retratos depois que os nomes desaparecem.',
      status: 'inactive',
      questType: 'secondary',
      branchKey: 'faceless_man',
      reward: 'Pista sobre o Rei Sem Nome',
      priority: 55,
    },
    {
      title: 'Sangue na Arena',
      description: 'Participe ou investigue um torneio na Arena de Combate onde lutadores vencidos somem das lembranças da plateia.',
      status: 'inactive',
      questType: 'secondary',
      branchKey: 'arena_blood',
      reward: 'Reputação na Guilda dos Aventureiros',
      priority: 50,
    },
    {
      title: 'Segredos do Mercado Negro',
      description: 'Explore o Distrito Baixo para encontrar documentos vendidos antes que sejam apagados.',
      status: 'inactive',
      questType: 'secondary',
      branchKey: 'black_market',
      reward: 'Contato com a Companhia das Sombras',
      priority: 50,
    },
    {
      title: 'As Catacumbas de Aurora',
      description: 'Investigue os esgotos antigos e descubra o caminho bloqueado para as catacumbas sob a cidade.',
      status: 'inactive',
      questType: 'secondary',
      branchKey: 'aurora_catacombs',
      reward: 'Desbloqueio das Catacumbas Antigas',
      priority: 55,
    },
  ],
  initialNpcs: [
    {
      name: 'Arvik',
      role: 'Taverneiro do Grifo Dourado',
      mood: 'pragmático',
      trust: 1,
      fear: 4,
      knownInfo: 'Lembra de pessoas que todos esqueceram.',
      secrets: 'Anotou nomes desaparecidos em um livro escondido sob o balcão.',
    },
    {
      name: 'Elenna',
      role: 'Bibliotecária da Biblioteca Arcana',
      mood: 'curiosa',
      trust: 2,
      fear: 2,
      knownInfo: 'Possui livros que mudam sozinhos.',
      secrets: 'Um dos livros ainda preserva o nome Eldric por poucos segundos quando aberto sob luz de vela.',
    },
    {
      name: 'Varek',
      role: 'Caçador de recompensas',
      mood: 'desconfiado',
      trust: 0,
      fear: 5,
      knownInfo: 'Viu uma pessoa desaparecer diante de seus olhos.',
      secrets: 'Reconheceu o símbolo do Rei Sem Nome no local do desaparecimento.',
    },
    {
      name: 'Irmã Maera',
      role: 'Sacerdotisa de Aurora',
      mood: 'calma',
      trust: 1,
      fear: 3,
      knownInfo: 'Investiga uma profecia antiga sobre nomes roubados.',
      secrets: 'A profecia menciona que apenas quem foi tocado pela falha da realidade consegue lembrar dos apagados.',
    },
  ],
  intro:
    'Aurora, a Cidade das Mil Oportunidades, brilha com mercados, guildas e promessas. No Grifo Dourado, porém, um nome insiste em sobreviver: Eldric. Ninguém se lembra dele, documentos se apagam, retratos mudam, e só os heróis percebem que alguém está sendo arrancado da realidade.',
  initialMessage:
    'O Grifo Dourado vibra com canecas, contratos e rumores de guilda. Então Arvik congela atrás do balcão ao encontrar um recibo assinado por Eldric, um mercador que todos juram nunca ter existido. A tinta começa a sumir diante de vocês. O que vocês fazem?',
  fallbackObjectives: [
    'Investigar o desaparecimento do mercador Eldric',
    'Descobrir por que ninguém se lembra dele',
    'Encontrar registros perdidos',
    'Identificar quem está apagando pessoas',
    'Descobrir a verdade sobre o Rei Sem Nome',
  ],
}

export const OFFICIAL_CAMPAIGNS = [TAVERNA_CAMPAIGN, AURORA_CAMPAIGN] as const

export function normalizeOfficialTitle(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function getOfficialCampaign(title?: string | null): OfficialCampaignDefinition | null {
  const normalized = normalizeOfficialTitle(title ?? '')
  if (normalized.includes('elyndria') || normalized.includes('aurora') || normalized.includes('esquecidos')) {
    return AURORA_CAMPAIGN
  }
  if (normalized.includes('taverna dos corvos') || normalized.includes('valdrak')) {
    return TAVERNA_CAMPAIGN
  }
  return null
}

export function isOfficialCampaign(title?: string | null) {
  return getOfficialCampaign(title) != null
}
