// Load env vars BEFORE any other imports that might need them.
// dotenv/config loads .env automatically (what Prisma CLI also uses).
import 'dotenv/config'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Campaign data ────────────────────────────────────────────────
const CAMPAIGN = {
  title: 'A Taverna dos Corvos',
  description: 'Jogadores chegam em uma vila isolada onde moradores desaparecem durante a noite. Rumores falam de um antigo culto escondido na floresta ao redor da vila.',
  theme: 'Mistério, investigação, horror medieval e fantasia sombria',
  level: 1,
  maxPlayers: 6,
}

const INITIAL_MEMORY = {
  currentScene: 'Chegada à vila de Valdrak',
  currentLocation: 'Taverna dos Corvos',
  currentObjective: 'Investigar os desaparecimentos na vila',
  currentThreat: 'Um culto oculto age durante a noite',
  tensionLevel: 3,
  discoveredClues: [] as string[],
  activeNPCs: [
    {
      name: 'Brós, o Taverneiro',
      role: 'informante',
      mood: 'desconfiado e desesperado',
      knownInfo: 'perdeu um funcionário nos desaparecimentos, ouviu cantos na floresta',
    },
  ],
  activeEnemies: [] as string[],
  storyFlags: {} as Record<string, boolean>,
  turnCount: 0,
  lastPlayerAction: '',
  lastMasterAction: '',
  summary:
    'Os aventureiros chegam à vila de Valdrak, onde moradores desaparecem misteriosamente durante a madrugada.',
}

const INITIAL_MESSAGE =
  `Uma chuva fina cobre os telhados tortos da pequena vila de Valdrak. ` +
  `O cheiro de madeira molhada e fumaça paira no ar enquanto você empurra a porta rangente da Taverna dos Corvos.\n\n` +
  `Dentro, o calor da lareira contrasta com o frio lá fora. Viajantes cochicham em mesas escuras. ` +
  `Brós, o taverneiro — homem robusto de olhos cansados — limpa o balcão e ergue os olhos para você.\n\n` +
  `*"Mais um aventureiro... ou veio apenas beber?"* ele murmura, a voz baixa.\n\n` +
  `Rumores circulam: moradores desaparecem durante a madrugada. Cantos estranhos vêm da floresta ao norte. ` +
  `Alguns juram ter visto olhos vermelhos entre as árvores.\n\n` +
  `**O que você faz?**`

const INITIAL_QUESTS = [
  {
    title: 'Investigar os desaparecimentos',
    description:
      'Moradores de Valdrak somem sem rastro durante a madrugada. Descubra quem está por trás disso antes que alguém mais desapareça.',
    status: 'active' as const,
    reward: '50 po + reputação em Valdrak',
    progress: null as string | null,
  },
  {
    title: 'Conversar com o taverneiro',
    description:
      'Brós sabe mais do que aparenta. Ganhe sua confiança para obter informações cruciais sobre os eventos recentes.',
    status: 'active' as const,
    reward: 'Informações valiosas e abrigo gratuito',
    progress: null as string | null,
  },
  {
    title: 'Explorar a floresta ao norte',
    description:
      'Todos os rumores apontam para a floresta densa ao norte. Algo — ou alguém — mora lá.',
    status: 'active' as const,
    reward: '30 po + pistas sobre o culto',
    progress: null as string | null,
  },
  {
    title: 'Descobrir a origem dos cantos',
    description:
      'Moradores relatam ouvir cantos estranhos durante a madrugada vindos da floresta. Descubra o que são.',
    status: 'active' as const,
    reward: 'Revelação sobre o culto oculto',
    progress: null as string | null,
  },
  {
    title: 'Encontrar o culto oculto',
    description:
      'Um culto antigo opera nas profundezas da floresta. Encontre-os, descubra seus planos e ponha um fim nisso.',
    status: 'active' as const,
    reward: '200 po + item mágico + salvação de Valdrak',
    progress: null as string | null,
  },
]

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════')
  console.log('   Oráculo d20 — Reset de Playtest')
  console.log('═══════════════════════════════════════════')

  // ── 1. Clean (FK-safe order) ────────────────────────────────────
  console.log('\n🧹 Limpando banco de dados...')

  await prisma.quest.deleteMany({})
  console.log('   ✓ Quests')

  await prisma.message.deleteMany({})
  console.log('   ✓ Mensagens')

  await prisma.campaignMemory.deleteMany({})
  console.log('   ✓ Memórias de campanha')

  await prisma.combatState.deleteMany({})
  console.log('   ✓ Estados de combate')

  await prisma.character.deleteMany({})
  console.log('   ✓ Personagens')

  // CampaignPlayer references Campaign — must be deleted before Campaign
  try {
    await prisma.campaignPlayer.deleteMany({})
    console.log('   ✓ Jogadores de campanha')
  } catch {
    console.log('   ⚠  CampaignPlayer: tabela ainda não existe no banco (rode a migration)')
  }

  await prisma.campaign.deleteMany({})
  console.log('   ✓ Campanhas')

  console.log('\n   ✅ Banco limpo.')

  // ── 2. Official campaign ────────────────────────────────────────
  console.log('\n🏰 Criando campanha oficial...')

  const campaign = await prisma.campaign.create({ data: CAMPAIGN })
  console.log(`   ✓ "${campaign.title}" (ID: ${campaign.id})`)

  // ── 3. Initial message ──────────────────────────────────────────
  await prisma.message.create({
    data: {
      campaignId: campaign.id,
      author: 'Mestre IA',
      role: 'master',
      content: INITIAL_MESSAGE,
    },
  })
  console.log('   ✓ Mensagem inicial')

  // ── 4. Campaign memory ──────────────────────────────────────────
  await prisma.campaignMemory.create({
    data: { campaignId: campaign.id, ...INITIAL_MEMORY },
  })
  console.log('   ✓ Memória da campanha')

  // ── 5. Quests ───────────────────────────────────────────────────
  console.log('\n📜 Criando quests iniciais...')
  const { count } = await prisma.quest.createMany({
    data: INITIAL_QUESTS.map(q => ({ ...q, campaignId: campaign.id })),
  })
  console.log(`   ✓ ${count} quests criadas`)

  // ── Summary ─────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════')
  console.log('   ✅ Playtest pronto!')
  console.log(`   📍 Campanha ID : ${campaign.id}`)
  console.log(`   🔗 URL         : /campaigns/${campaign.id}`)
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch(e => {
    console.error('\n❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
