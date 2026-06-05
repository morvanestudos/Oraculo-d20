import { config } from 'dotenv'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { OFFICIAL_CAMPAIGNS } from '../lib/officialCampaigns'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

console.log('DATABASE_URL carregada:', Boolean(process.env.DATABASE_URL))

const prisma = new PrismaClient()

async function createOfficialCampaign(definition: (typeof OFFICIAL_CAMPAIGNS)[number]) {
  const campaign = await prisma.campaign.create({
    data: {
      title: definition.title,
      description: definition.description,
      theme: definition.theme,
      level: definition.level,
      maxPlayers: definition.maxPlayers,
    },
  })

  await prisma.campaignMemory.create({
    data: { campaignId: campaign.id, ...definition.initialMemory },
  })

  const { count } = await prisma.quest.createMany({
    data: definition.initialQuests.map((quest) => ({
      campaignId: campaign.id,
      title: quest.title,
      description: quest.description ?? null,
      status: quest.status ?? 'active',
      reward: quest.reward ?? null,
      questType: quest.questType ?? 'secondary',
      objectives: (quest.objectives ?? []) as any,
      branchKey: quest.branchKey ?? null,
      objectiveList: (quest.objectiveList ?? null) as any,
      consequences: (quest.consequences ?? null) as any,
      hidden: quest.hidden ?? false,
      priority: quest.priority ?? 0,
    })),
  })

  await prisma.npc.createMany({
    data: definition.initialNpcs.map((npc) => ({
      campaignId: campaign.id,
      name: npc.name,
      role: npc.role ?? null,
      mood: npc.mood,
      trust: npc.trust,
      fear: npc.fear,
      knownInfo: npc.knownInfo ?? null,
      secrets: npc.secrets ?? null,
      active: true,
    })),
  })

  console.log(`   ✓ "${campaign.title}" (ID: ${campaign.id})`)
  console.log(`      Quests: ${count} | NPCs: ${definition.initialNpcs.length}`)
  return campaign
}

async function main() {
  console.log('\n═══════════════════════════════════════════')
  console.log('   Oráculo d20 — Reset de Playtest')
  console.log('═══════════════════════════════════════════')

  console.log('\n🧹 Limpando banco...')

  await prisma.quest.deleteMany({})
  console.log('   ✓ Quests')

  await prisma.message.deleteMany({})
  console.log('   ✓ Mensagens')

  await prisma.campaignMemory.deleteMany({})
  console.log('   ✓ Memórias')

  await prisma.combatState.deleteMany({})
  console.log('   ✓ Combates')

  await prisma.character.deleteMany({})
  console.log('   ✓ Personagens')

  await prisma.npc.deleteMany({})
  console.log('   ✓ NPCs')

  try {
    await prisma.campaignPlayer.deleteMany({})
    console.log('   ✓ Jogadores')
  } catch {
    console.log('   ⚠ CampaignPlayer: rode a migration primeiro (npm run prisma:migrate)')
  }

  await prisma.campaign.deleteMany({})
  console.log('   ✓ Campanhas')

  console.log('\n🏰 Criando campanhas oficiais...')

  const created = []
  for (const definition of OFFICIAL_CAMPAIGNS) {
    created.push(await createOfficialCampaign(definition))
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('   ✅ Playtest pronto!')
  created.forEach((campaign) => {
    console.log(`   📍 ${campaign.title}: /campaigns/${campaign.id}`)
  })
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
