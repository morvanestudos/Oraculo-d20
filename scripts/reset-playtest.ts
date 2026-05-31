import "dotenv/config"
import { config } from "dotenv"
import { resolve } from "node:path"
import prisma from "../lib/prisma"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })



async function main() {
  console.log("\n═══════════════════════════════════════════")
  console.log("   Oráculo d20 — Reset de Playtest")
  console.log("═══════════════════════════════════════════\n")

  console.log("🧹 Limpando banco...")
  await prisma.message.deleteMany()
  await prisma.campaignMemory.deleteMany()
  await prisma.combatState.deleteMany()
  await prisma.campaignPlayer.deleteMany()
  await prisma.quest.deleteMany()      // FK para Campaign — deve vir antes
  await prisma.character.deleteMany()
  await prisma.campaign.deleteMany()
  console.log("   ✓ Todos os dados removidos\n")

  console.log("🏰 Criando campanha oficial...")
  const campaign = await prisma.campaign.create({
    data: {
      title: "A Taverna dos Corvos",
      description:
        "Jogadores chegam em uma vila isolada onde moradores desaparecem durante a noite. " +
        "Rumores falam de um antigo culto escondido na floresta ao redor da vila.",
      theme: "Mistério",
      level: 1,
      maxPlayers: 6,
      accessCode: "CORVOS",
    },
  })
  console.log(`   ✓ Campanha criada (ID: ${campaign.id})`)
  console.log(`   🔑 Código de acesso : CORVOS\n`)

  console.log("🧠 Criando memória inicial...")
  await prisma.campaignMemory.create({
    data: {
      campaignId: campaign.id,
      currentScene: "Chegada à vila de Valdrak",
      currentLocation: "Taverna dos Corvos",
      currentObjective: "Investigar os desaparecimentos",
      currentThreat: "Culto oculto",
      tensionLevel: 3,
    },
  })
  console.log("   ✓ Memória criada\n")

  console.log("═══════════════════════════════════════════")
  console.log("   Playtest resetado com sucesso")
  console.log(`   📍 Campanha ID : ${campaign.id}`)
  console.log(`   🔗 URL         : /campaigns/${campaign.id}`)
  console.log("═══════════════════════════════════════════\n")
}

main()
  .catch((error) => {
    console.error("\n❌ Erro durante reset:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
