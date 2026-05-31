import type { Campaign, Character, Message, CampaignMemory, PendingTest, ActiveNPC, QuestUpdate, Quest } from './types'
import { createOpenAIClient } from './openai'
import { analyzeAction } from './masterEngine'
import { narrateAction, progressSceneState, sceneStateFromMemory, buildMemorySummary } from './narrativeEngine'

export type AIMasterRequest = {
  playerMessage: string
  campaign: Campaign
  activeCharacter: Character | null
  recentMessages: Pick<Message, 'author' | 'role' | 'content' | 'createdAt'>[]
  campaignMemory: CampaignMemory | null
  pendingTest?: PendingTest | null
  activeQuests?: Pick<Quest, 'title' | 'description' | 'progress'>[]
}

export type AIMasterResponse = {
  narration: string
  requiresRoll: boolean
  rollType: 'ataque' | 'investigacao' | 'percepcao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | 'geral' | 'nenhum'
  difficultyClass: number | null
  suggestedActions?: string[]
  questsUpdates?: QuestUpdate[]
  inventoryUpdates?: Array<{ action: 'add' | 'remove'; item: { name: string; description?: string; rarity?: string; type?: string } }>
  memoryUpdates: {
    currentScene: string
    currentLocation: string
    currentObjective: string
    currentThreat: string
    tensionLevel: number
    discoveredClues: string[]
    activeNPCs: ActiveNPC[]
    activeEnemies: string[]
    storyFlags: Record<string, boolean>
    summary: string
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

const MASTER_SYSTEM_PROMPT = `Você é o Mestre de uma campanha de RPG dark fantasy. Você narra aventuras imersivas, cria tensão, e guia jogadores por escolhas com consequências reais. NUNCA se identifique como IA, assistente ou chatbot. Você É o Mestre.

━━ IDENTIDADE ━━
Fale SEMPRE como narrador de RPG. Tom sombrio, cinematográfico, direto.
Nunca quebre a imersão. Nunca use jargões técnicos ou linguagem de chatbot.
Nunca controle as ações ou decisões do jogador.

━━ FORMATO OBRIGATÓRIO ━━
• Narração: MÁXIMO 3 parágrafos CURTOS (2-4 frases cada)
• Sempre termine com UMA das duas opções:
  - Uma pergunta direta ao jogador: "O que você faz?"
  - OU 2 a 4 ações sugeridas em suggestedActions
• Use o nome do personagem ativo quando disponível
• Ambiente: descreva o que se vê, ouve e sente — nunca apenas o que acontece

━━ USO DA MEMÓRIA ━━
Considere SEMPRE:
1. Local atual → descreva o ambiente correto
2. Ameaça ativa → crie tensão coerente com ela
3. NPCs conhecidos → faça-os reagir, mudar humor, revelar informações
4. Quests ativas → avance-as quando houver progresso
5. Pistas descobertas → conecte-as à narrativa
6. Tensão atual → escale conforme a cena (1=calma, 10=caos)

━━ CONSEQUÊNCIAS REAIS ━━
A cada resposta, aplique pelo menos UMA consequência via memoryUpdates:
• Descobriu pista → adicione em discoveredClues (ex: "Símbolo do culto na porta")
• NPC reagiu → atualize mood no activeNPCs (ex: desconfiado → aliado)
• Tensão mudou → atualize tensionLevel (sobe em perigo, desce em vitória)
• Local mudou → atualize currentLocation
• Quest progrediu → adicione em questsUpdates com action "update" ou "complete"
• Novo inimigo → adicione em activeEnemies

━━ ROLAGENS DE D20 ━━
Peça APENAS quando houver risco real com consequência de falha.
Quando pedir:
  - Explique o risco na narração antes de pedir
  - Use rollType correto: ataque/investigacao/percepcao/carisma/destreza/forca/arcano/cura/geral
  - CD entre 8 (fácil) e 20 (quase impossível). Exemplos:
    • Persuadir aliado = CD 10 | Persuadir hostil = CD 16
    • Escalar parede lisa = CD 14 | Detectar armadilha oculta = CD 16
    • Atacar criatura = CD 13 | Lançar magia sob pressão = CD 15

━━ GESTÃO DE QUESTS ━━
Em questsUpdates, use as seguintes regras:

QUEST PRINCIPAL "A Taverna dos Corvos":
• Quando o jogador interagir com o TAVERNEIRO → action:"update", title:"A Taverna dos Corvos", progress:"Conversei com o taverneiro — [resumo do que foi revelado]"
• Quando investigar DESAPARECIMENTOS → action:"update", title:"A Taverna dos Corvos", progress:"Investigando os desaparecimentos — [pista encontrada]"
• Quando entrar na FLORESTA → action:"update", title:"A Taverna dos Corvos", progress:"Explorando a floresta — [descoberta]"
• Quando descobrir o CULTO → action:"update", title:"A Taverna dos Corvos", progress:"Culto oculto revelado — [detalhes]"
• Quando enfrentar a CRIATURA FINAL → action:"complete", title:"A Taverna dos Corvos"

QUESTS SECUNDÁRIAS:
• Sempre que um NPC mencionar um pedido, problema pessoal ou recompensa → action:"create" com nova quest secundária
• Exemplos: mercador que perdeu mercadoria, aldeão doente, guardião com segredo
• Cada quest: title (máximo 5 palavras), description (1 frase), reward (se houver)
• Atualize progress com texto curto quando houver avanço
• Complete com action:"complete" quando o objetivo for atingido

━━ PROIBIÇÕES ━━
✗ Nunca mencione D&D, Forgotten Realms, Wizards of the Coast
✗ Nunca repita a ação do jogador na narração
✗ Nunca escreva mais de 3 parágrafos
✗ Nunca deixe o final sem pergunta OU ações sugeridas

━━ FORMATO JSON ━━
Responda APENAS com JSON válido, sem texto adicional, sem markdown.
Chaves obrigatórias: narration, requiresRoll, rollType, difficultyClass, suggestedActions, questsUpdates, memoryUpdates.
memoryUpdates deve conter: currentScene, currentLocation, currentObjective, currentThreat, tensionLevel(1-10), discoveredClues[], activeNPCs[], activeEnemies[], storyFlags{}, summary.
Se requiresRoll=false, rollType="nenhum" e difficultyClass=null.
suggestedActions: array de 2 a 4 strings, máximo 7 palavras cada.`

// ─── Prompt builder ────────────────────────────────────────────────────────────

function formatNPCs(npcs: ActiveNPC[]): string {
  if (!npcs.length) return 'Nenhum NPC conhecido ainda.'
  return npcs.map(n =>
    `• ${n.name} [${n.role}] — humor: ${n.mood}${n.knownInfo ? ` — sabe: ${n.knownInfo}` : ''}`
  ).join('\n')
}

function formatQuests(quests?: AIMasterRequest['activeQuests']): string {
  if (!quests?.length) return 'Nenhuma quest ativa.'
  return quests.map(q => {
    const parts = [`• ${q.title}`]
    if (q.description) parts.push(`  Desc: ${q.description.slice(0, 80)}`)
    if (q.progress) parts.push(`  Progresso: ${q.progress}`)
    return parts.join('\n')
  }).join('\n')
}

function formatRecentMessages(messages: Pick<Message, 'author' | 'role' | 'content' | 'createdAt'>[]) {
  if (!messages.length) return 'Nenhuma mensagem recente.'
  return messages
    .slice(-8)
    .map(m => {
      const who = m.role === 'player' ? `Jogador (${m.author})` : m.role === 'master' ? 'Mestre' : 'Sistema'
      return `${who}: ${m.content.slice(0, 200)}`
    })
    .join('\n')
}

function buildAIMasterPrompt(request: AIMasterRequest): string {
  const mem = request.campaignMemory

  const campaignCtx = [
    `Campanha: ${request.campaign.title}`,
    request.campaign.theme ? `Tema: ${request.campaign.theme}` : '',
    `Nível: ${request.campaign.level || 1}`,
  ].filter(Boolean).join(' | ')

  const charCtx = request.activeCharacter
    ? [
        `Personagem: ${request.activeCharacter.name}`,
        `${request.activeCharacter.race} ${request.activeCharacter.className} nível ${request.activeCharacter.level}`,
        `HP ${request.activeCharacter.hp} | CA ${request.activeCharacter.ac}`,
        `FOR ${request.activeCharacter.attributes.str} DES ${request.activeCharacter.attributes.dex} CON ${request.activeCharacter.attributes.con} INT ${request.activeCharacter.attributes.int} SAB ${request.activeCharacter.attributes.wis} CAR ${request.activeCharacter.attributes.cha}`,
        request.activeCharacter.story ? `Backstory: ${request.activeCharacter.story.slice(0, 120)}` : '',
        request.activeCharacter.inventory?.length
          ? `Inventário: ${request.activeCharacter.inventory.slice(0, 5).join(', ')}`
          : '',
      ].filter(Boolean).join('\n')
    : 'Nenhum personagem ativo.'

  const memCtx = mem
    ? [
        `Cena: ${mem.currentScene}`,
        `Local: ${mem.currentLocation}`,
        `Objetivo: ${mem.currentObjective}`,
        `Ameaça: ${mem.currentThreat}`,
        `Tensão: ${mem.tensionLevel}/10`,
        `Pistas: ${mem.discoveredClues.length ? mem.discoveredClues.join(' | ') : 'nenhuma ainda'}`,
        `Inimigos: ${mem.activeEnemies.length ? mem.activeEnemies.join(', ') : 'nenhum'}`,
        mem.summary ? `Resumo: ${mem.summary.slice(0, 150)}` : '',
      ].filter(Boolean).join('\n')
    : 'Memória não inicializada — use contexto básico da campanha.'

  const npcCtx = formatNPCs(mem?.activeNPCs ?? [])
  const questCtx = formatQuests(request.activeQuests)

  const pendingCtx = request.pendingTest
    ? `⚠️ Teste pendente: tipo=${request.pendingTest.type}, CD=${request.pendingTest.difficultyClass}, motivo=${request.pendingTest.reason}`
    : ''

  return `━━ CAMPANHA ━━
${campaignCtx}

━━ PERSONAGEM ATIVO ━━
${charCtx}

━━ ESTADO DO MUNDO ━━
${memCtx}

━━ NPCS CONHECIDOS ━━
${npcCtx}

━━ QUESTS ATIVAS ━━
${questCtx}

━━ HISTÓRICO RECENTE ━━
${formatRecentMessages(request.recentMessages)}
${pendingCtx ? '\n' + pendingCtx : ''}

━━ AÇÃO DO JOGADOR ━━
${request.playerMessage}

Responda como Mestre. JSON válido apenas.`
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function cleanJsonText(text: string): string {
  const stripped = text.replace(/```json|```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  return match ? match[0] : stripped
}

function safeParseResponse(text: string) {
  try { return JSON.parse(text) }
  catch { return JSON.parse(cleanJsonText(text)) }
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateAIMasterResponse(request: AIMasterRequest): Promise<AIMasterResponse> {
  const client = createOpenAIClient()
  if (!client) throw new Error('OpenAI API key is not configured.')

  const userPrompt = buildAIMasterPrompt(request)

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    temperature: 0.82,
    top_p: 0.95,
    input: [
      { role: 'system', content: MASTER_SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
  })

  const text = Array.isArray(response.output)
    ? response.output.map((item: any) => {
        if (typeof item === 'string') return item
        if ('content' in item && Array.isArray(item.content)) {
          return item.content.map((e: any) => e.text || '').join('')
        }
        return ''
      }).join('')
    : typeof response.output_text === 'string'
    ? response.output_text
    : ''

  const parsed = safeParseResponse(text)
  const mem = request.campaignMemory

  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions.filter((a: unknown) => typeof a === 'string').slice(0, 4)
    : []

  const questsUpdates = Array.isArray(parsed.questsUpdates)
    ? parsed.questsUpdates.filter((q: any) => q?.action && q?.title)
    : []

  const inventoryUpdates = Array.isArray(parsed.inventoryUpdates)
    ? parsed.inventoryUpdates.filter((u: any) => u?.action && u?.item?.name)
    : undefined

  return {
    narration:      String(parsed.narration || '').trim(),
    requiresRoll:   Boolean(parsed.requiresRoll),
    rollType:       parsed.rollType || 'nenhum',
    difficultyClass: parsed.difficultyClass ?? null,
    suggestedActions,
    questsUpdates,
    inventoryUpdates,
    memoryUpdates: {
      currentScene:    String(parsed.memoryUpdates?.currentScene    || mem?.currentScene    || 'início da aventura'),
      currentLocation: String(parsed.memoryUpdates?.currentLocation || mem?.currentLocation || 'local desconhecido'),
      currentObjective:String(parsed.memoryUpdates?.currentObjective|| mem?.currentObjective|| 'seguir em frente'),
      currentThreat:   String(parsed.memoryUpdates?.currentThreat   || mem?.currentThreat   || 'ameaça desconhecida'),
      tensionLevel:    Number(parsed.memoryUpdates?.tensionLevel     ?? mem?.tensionLevel    ?? 1),
      discoveredClues: Array.isArray(parsed.memoryUpdates?.discoveredClues) ? parsed.memoryUpdates.discoveredClues : mem?.discoveredClues || [],
      activeNPCs:      Array.isArray(parsed.memoryUpdates?.activeNPCs)      ? parsed.memoryUpdates.activeNPCs      : mem?.activeNPCs      || [],
      activeEnemies:   Array.isArray(parsed.memoryUpdates?.activeEnemies)   ? parsed.memoryUpdates.activeEnemies   : mem?.activeEnemies   || [],
      storyFlags:      typeof parsed.memoryUpdates?.storyFlags === 'object'  ? parsed.memoryUpdates.storyFlags      : mem?.storyFlags      || {},
      summary:         String(parsed.memoryUpdates?.summary || mem?.summary || ''),
    },
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallbackSuggestedActions(actionType: string | null, tensionLevel: number, location: string): string[] {
  const loc = location.toLowerCase()
  const isTaverna = loc.includes('taverna') || loc.includes('valdrak')

  if (actionType === 'ataque' || tensionLevel >= 7) {
    return ['Atacar com tudo', 'Recuar e reagrupar', 'Usar item ou habilidade', 'Pedir ajuda']
  }
  if (actionType === 'investigacao' || actionType === 'percepcao') {
    return ['Examinar de perto', 'Procurar passagem oculta', 'Perguntar aos presentes', 'Registrar a descoberta']
  }
  if (actionType === 'carisma') {
    return ['Insistir na conversa', 'Oferecer algo em troca', 'Ameaçar discretamente', 'Tentar uma abordagem diferente']
  }
  if (actionType === 'arcano') {
    return ['Lançar outro feitiço', 'Analisar a magia presente', 'Tentar dissipar o encantamento']
  }
  if (isTaverna && tensionLevel < 4) {
    return ['Conversar com o taverneiro', 'Observar os clientes', 'Pedir informações sobre os desaparecimentos', 'Explorar o lado de fora']
  }
  if (tensionLevel >= 4) {
    return ['Avançar com cautela', 'Observar o ambiente', 'Escutar os sons', 'Preparar uma armadilha']
  }
  return ['Explorar o local', 'Investigar os arredores', 'Procurar por pistas', 'Falar com alguém']
}

function buildFallbackMemoryUpdates(campaignMemory: CampaignMemory | null): AIMasterResponse['memoryUpdates'] {
  return {
    currentScene:    campaignMemory?.currentScene    || 'início da aventura',
    currentLocation: campaignMemory?.currentLocation || 'local desconhecido',
    currentObjective:campaignMemory?.currentObjective|| 'seguir em frente',
    currentThreat:   campaignMemory?.currentThreat   || 'ameaça desconhecida',
    tensionLevel:    campaignMemory?.tensionLevel     ?? 1,
    discoveredClues: campaignMemory?.discoveredClues  || [],
    activeNPCs:      campaignMemory?.activeNPCs       || [],
    activeEnemies:   campaignMemory?.activeEnemies    || [],
    storyFlags:      campaignMemory?.storyFlags       || {},
    summary:         campaignMemory?.summary          || '',
  }
}

export async function generateFallbackAIMasterResponse(request: AIMasterRequest): Promise<AIMasterResponse> {
  const actionAnalysis = analyzeAction(request.playerMessage)
  const currentSceneState = request.campaignMemory
    ? sceneStateFromMemory(request.campaignMemory)
    : progressSceneState({
        campaignId:       request.campaign.id,
        currentScene:     'início da aventura',
        currentLocation:  `os arredores de ${request.campaign.title}`,
        currentObjective: 'explorar e descobrir',
        currentThreat:    'desconhecido',
        tensionLevel:     1,
        discoveredClues:  [],
        activeNPCs:       [],
        activeEnemies:    [],
        storyFlags:       {},
        turnCount:        0,
        lastPlayerAction: '',
        lastMasterAction: '',
        environmentDetails: [],
        updatedAt:        new Date().toISOString(),
      }, request.playerMessage, actionAnalysis.actionType)

  const updatedSceneState = progressSceneState(currentSceneState, request.playerMessage, actionAnalysis.actionType)
  const narrativeResult   = narrateAction(updatedSceneState, request.playerMessage, actionAnalysis.actionType, request.campaignMemory)

  return {
    narration:    narrativeResult.narration,
    requiresRoll: Boolean(narrativeResult.testRequired),
    rollType:     (actionAnalysis.testType as AIMasterResponse['rollType']) || 'nenhum',
    difficultyClass: narrativeResult.testRequired ? actionAnalysis.difficulty ?? 14 : null,
    suggestedActions: buildFallbackSuggestedActions(
      actionAnalysis.actionType,
      updatedSceneState.tensionLevel,
      updatedSceneState.currentLocation
    ),
    questsUpdates: [],
    memoryUpdates: {
      currentScene:    updatedSceneState.currentScene,
      currentLocation: updatedSceneState.currentLocation,
      currentObjective:updatedSceneState.currentObjective,
      currentThreat:   updatedSceneState.currentThreat,
      tensionLevel:    updatedSceneState.tensionLevel,
      discoveredClues: updatedSceneState.discoveredClues,
      activeNPCs:      updatedSceneState.activeNPCs,
      activeEnemies:   updatedSceneState.activeEnemies,
      storyFlags:      updatedSceneState.storyFlags,
      summary:         buildMemorySummary(updatedSceneState, request.campaignMemory),
    },
  }
}
