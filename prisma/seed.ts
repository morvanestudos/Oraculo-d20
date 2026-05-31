import { config } from "dotenv"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

console.log("DATABASE_URL carregada:", Boolean(process.env.DATABASE_URL))

const prisma = new PrismaClient()

// ── Campaign ──────────────────────────────────────────────────────
const CAMPAIGN = {
  title: "A Taverna dos Corvos",
  description:
    "Jogadores chegam em uma vila isolada onde moradores desaparecem durante a noite. Rumores falam de um antigo culto escondido na floresta ao redor da vila.",
  theme: "Mistério, investigação, horror medieval e fantasia sombria",
  level: 1,
  maxPlayers: 6,
}

const INITIAL_MEMORY = {
  currentScene: "Chegada à vila de Valdrak",
  currentLocation: "Taverna dos Corvos",
  currentObjective: "Investigar os desaparecimentos na vila",
  currentThreat: "Um culto oculto age durante a noite",
  tensionLevel: 3,
  discoveredClues: [] as string[],
  activeNPCs: [
    {
      name: "Brós, o Taverneiro",
      role: "informante",
      mood: "desconfiado e desesperado",
      knownInfo: "perdeu um funcionário nos desaparecimentos, ouviu cantos na floresta",
    },
  ],
  activeEnemies: [] as string[],
  storyFlags: {} as Record<string, boolean>,
  turnCount: 0,
  lastPlayerAction: "",
  lastMasterAction: "",
  summary:
    "Os aventureiros chegam à vila de Valdrak, onde moradores desaparecem misteriosamente durante a madrugada.",
}

const INITIAL_QUESTS = [
  {
    title: "Investigar os desaparecimentos",
    description:
      "Moradores de Valdrak somem sem rastro durante a madrugada. Descubra quem está por trás disso antes que alguém mais desapareça.",
    status: "active" as const,
    reward: "50 po + reputação em Valdrak",
    progress: null as string | null,
  },
  {
    title: "Conversar com o taverneiro",
    description:
      "Brós sabe mais do que aparenta. Ganhe sua confiança para obter informações cruciais sobre os eventos recentes.",
    status: "active" as const,
    reward: "Informações valiosas e abrigo gratuito",
    progress: null as string | null,
  },
  {
    title: "Explorar a floresta ao norte",
    description: "Todos os rumores apontam para a floresta densa ao norte. Algo — ou alguém — mora lá.",
    status: "active" as const,
    reward: "30 po + pistas sobre o culto",
    progress: null as string | null,
  },
  {
    title: "Descobrir a origem dos cantos",
    description:
      "Moradores relatam ouvir cantos estranhos durante a madrugada vindos da floresta. Descubra o que são.",
    status: "active" as const,
    reward: "Revelação sobre o culto oculto",
    progress: null as string | null,
  },
  {
    title: "Encontrar o culto oculto",
    description:
      "Um culto antigo opera nas profundezas da floresta. Encontre-os, descubra seus planos e ponha um fim nisso.",
    status: "active" as const,
    reward: "200 po + item mágico + salvação de Valdrak",
    progress: null as string | null,
  },
]

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log("\n═══════════════════════════════════════════")
  console.log("   Oráculo d20 — Reset de Playtest")
  console.log("═══════════════════════════════════════════")

  console.log("\n🧹 Limpando banco...")

  await prisma.quest.deleteMany({})
  console.log("   ✓ Quests")

  await prisma.message.deleteMany({})
  console.log("   ✓ Mensagens")

  await prisma.campaignMemory.deleteMany({})
  console.log("   ✓ Memórias")

  await prisma.combatState.deleteMany({})
  console.log("   ✓ Combates")

  await prisma.character.deleteMany({})
  console.log("   ✓ Personagens")

  try {
    await prisma.campaignPlayer.deleteMany({})
    console.log("   ✓ Jogadores")
  } catch {
    console.log("   ⚠  CampaignPlayer: rode a migration primeiro (npm run prisma:migrate)")
  }

  await prisma.campaign.deleteMany({})
  console.log("   ✓ Campanhas")

  console.log("\n🏰 Criando campanha oficial...")

  const campaign = await prisma.campaign.create({ data: CAMPAIGN })
  console.log(`   ✓ "${campaign.title}" (ID: ${campaign.id})`)

  await prisma.campaignMemory.create({
    data: { campaignId: campaign.id, ...INITIAL_MEMORY },
  })
  console.log("   ✓ Memória da campanha")

  const { count } = await prisma.quest.createMany({
    data: INITIAL_QUESTS.map((q) => ({ ...q, campaignId: campaign.id })),
  })
  console.log(`   ✓ ${count} quests`)

  console.log("\n═══════════════════════════════════════════")
  console.log("   ✅ Playtest pronto!")
  console.log(`   📍 Campanha ID : ${campaign.id}`)
  console.log(`   🔗 URL         : /campaigns/${campaign.id}`)
  console.log("═══════════════════════════════════════════\n")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
