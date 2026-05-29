import { configDotenv } from 'dotenv'

// Load env vars — tries .env.local first (Next.js convention), then .env (Prisma convention)
configDotenv({ path: '.env.local', override: false })
configDotenv({ path: '.env', override: false })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CAMPAIGN = {
  title: 'A Taverna dos Corvos',
  description: 'Jogadores chegam em uma vila isolada onde moradores desaparecem durante a noite. Rumores falam de um antigo culto escondido na floresta ao redor da vila.',
  theme: 'Mistério, investigação, horror medieval e fantasia sombria',
  level: 1,
  maxPlayers: 6,
}

const INITIAL_MESSAGE = `Uma chuva fina cobre os telhados tortos da pequena vila de Valdrak. O cheiro de madeira molhada e fumaça paira no ar.

Na velha Taverna dos Corvos, viajantes cochicham sobre pessoas desaparecendo durante a madrugada. Alguns dizem ouvir cantos vindos da floresta. Outros juram ter visto olhos vermelhos entre as árvores.

Você empurra a porta de madeira rangente. O calor da lareira contrasta com o frio úmido lá fora. Brós, o taverneiro — um homem robusto de olhos cansados — limpa o balcão e ergue os olhos para você com desconfiança e esperança ao mesmo tempo.

*"Mais um aventureiro? Ou veio apenas beber?"* ele murmura, a voz baixa para que os outros clientes não ouçam.

**O que você faz?**`

const INITIAL_MEMORY = {
  currentScene: 'chegada à taverna',
  currentLocation: 'Taverna dos Corvos, vila de Valdrak',
  currentObjective: 'descobrir o que está acontecendo com os desaparecimentos em Valdrak',
  currentThreat: 'desaparecimentos misteriosos durante a madrugada',
  tensionLevel: 2,
  discoveredClues: [] as string[],
  activeNPCs: [
    {
      name: 'Brós, o Taverneiro',
      role: 'fonte de informação',
      mood: 'desconfiado e desesperado',
      knownInfo: 'perdeu um funcionário nos desaparecimentos, sabe de rumores sobre a floresta'
    }
  ],
  activeEnemies: [] as string[],
  storyFlags: {} as Record<string, boolean>,
  turnCount: 0,
  lastPlayerAction: '',
  lastMasterAction: '',
  summary: 'Aventureiros chegam à Taverna dos Corvos na vila de Valdrak. Moradores estão desaparecendo durante a madrugada. Rumores de um culto antigo operando na floresta ao norte.',
}

const INITIAL_QUESTS = [
  {
    title: 'Investigar os desaparecimentos',
    description: 'Moradores de Valdrak somem sem deixar rastro durante a madrugada. Descubra quem está por trás disso antes que alguém mais desapareça.',
    status: 'active' as const,
    reward: '50 po + reputação em Valdrak',
    progress: null as string | null,
  },
  {
    title: 'Conversar com o taverneiro',
    description: 'Brós sabe mais do que aparenta. Ganhe sua confiança para obter informações cruciais sobre os eventos recentes.',
    status: 'active' as const,
    reward: 'Informações valiosas e abrigo gratuito',
    progress: null as string | null,
  },
  {
    title: 'Explorar a floresta ao norte',
    description: 'Todos os rumores apontam para a floresta densa ao norte da vila. Algo — ou alguém — mora lá.',
    status: 'active' as const,
    reward: '30 po + pistas sobre o culto',
    progress: null as string | null,
  },
  {
    title: 'Descobrir a origem dos cantos',
    description: 'Moradores relatam ouvir cantos estranhos durante a madrugada vindos da floresta. Descubra o que são.',
    status: 'active' as const,
    reward: 'Revelação sobre o culto oculto',
    progress: null as string | null,
  },
  {
    title: 'Encontrar o culto oculto',
    description: 'Suspeita-se de um culto antigo operando nas profundezas da floresta. Encontre-os, descubra seus planos e ponha um fim nisso.',
    status: 'active' as const,
    reward: '200 po + item mágico raro + salvação de Valdrak',
    progress: null as string | null,
  },
]

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  Oráculo d20 — Seed de Playtest')
  console.log('═══════════════════════════════════════')

  // ── PART 1: Clean all data ──────────────────
  console.log('\n🧹 Limpando banco de dados...')

  await prisma.quest.deleteMany({})
  console.log('   ✓ Quests removidas')

  await prisma.message.deleteMany({})
  console.log('   ✓ Mensagens removidas')

  await prisma.campaignMemory.deleteMany({})
  console.log('   ✓ Memórias de campanha removidas')

  await prisma.combatState.deleteMany({})
  console.log('   ✓ Estados de combate removidos')

  await prisma.character.deleteMany({})
  console.log('   ✓ Personagens removidos')

  await prisma.campaign.deleteMany({})
  console.log('   ✓ Campanhas removidas')

  console.log('\n✅ Banco limpo com sucesso.')

  // ── PART 2: Create official campaign ───────
  console.log('\n🏰 Criando campanha oficial...')

  const campaign = await prisma.campaign.create({ data: CAMPAIGN })
  console.log(`   ✓ Campanha: "${campaign.title}" (ID ${campaign.id})`)

  // ── Initial message ──────────────────────────
  await prisma.message.create({
    data: {
      campaignId: campaign.id,
      author: 'Mestre IA',
      role: 'master',
      content: INITIAL_MESSAGE,
    }
  })
  console.log('   ✓ Mensagem inicial criada')

  // ── Campaign memory ──────────────────────────
  await prisma.campaignMemory.create({
    data: {
      campaignId: campaign.id,
      ...INITIAL_MEMORY,
    }
  })
  console.log('   ✓ Memória de campanha criada')

  // ── PART 3: Quests ───────────────────────────
  console.log('\n📜 Criando quests iniciais...')

  const { count } = await prisma.quest.createMany({
    data: INITIAL_QUESTS.map(q => ({ ...q, campaignId: campaign.id }))
  })
  console.log(`   ✓ ${count} quests criadas`)

  // ── Summary ──────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log('  ✅ Playtest pronto!')
  console.log(`  📍 Campanha ID: ${campaign.id}`)
  console.log(`  🔗 /campaigns/${campaign.id}`)
  console.log('═══════════════════════════════════════\n')
}

main()
  .catch(e => {
    console.error('\n❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
