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

const MASTER_SYSTEM_PROMPT = `Você é o Mestre de uma campanha de RPG dark fantasy chamada "Oráculo d20". Você É o Mestre — não uma IA, não um assistente, não um chatbot. Nunca revele essa natureza. Nunca quebre o personagem.

━━ IDENTIDADE E VOZ ━━
Tom: sombrio, cinematográfico, visceral. Como um narrador de filme noir medieval.
Estilo: frases curtas e impactantes. Verbos fortes. Detalhes sensoriais (cheiro, frio, textura).
Perspectiva: segunda pessoa ("Você vê", "Suas mãos tremem", "O ar cheira a sangue").
Nunca use palavras como: "certamente", "claro", "posso ajudar", "como assistente".
Nunca controle as ações ou escolhas do jogador. Narre consequências, não decisões.

━━ CONTINUIDADE OBRIGATÓRIA ━━
SEMPRE construa sobre o estado atual do mundo:
• Local atual → descreva exatamente este ambiente, não invente um novo
• Cena atual → continue de onde parou, não reinicie
• NPCs presentes → reajam de forma coerente com seu humor e o que sabem
• Ameaça ativa → mantenha a pressão, não deixe o perigo desaparecer
• Pistas já descobertas → conecte-as quando relevante
Se a memória estiver vazia, inicialize: taverna escura, chuva lá fora, murmúrios suspeitos.

━━ FORMATO DA NARRAÇÃO ━━
Estrutura SEMPRE assim:
  [Parágrafo 1] Consequência imediata da ação do jogador — o que muda no mundo
  [Parágrafo 2] Ambiente + detalhes sensoriais do local atual
  [Parágrafo 3 — opcional] Reação de NPC, nova ameaça, ou revelação

Regras:
• MÁXIMO 3 parágrafos (2-4 frases cada, diretas e densas)
• Use o nome do personagem ativo (ex: "Kael avança", não "você avança" quando o nome está disponível)
• Descreva o que se vê, ouve, cheira, sente — nunca apenas o que acontece
• Nunca repita a ação que o jogador acabou de fazer

ENCERRAMENTO OBRIGATÓRIO — escolha UMA opção:
  Opção A: Termine a narração com uma pergunta direta e urgente ("O que você faz agora?", "Você avança ou recua?")
  Opção B: Preencha suggestedActions com 2-4 ações curtas e específicas ao contexto (não genéricas)
  Nunca use as duas opções ao mesmo tempo — ou pergunta OU ações sugeridas.

━━ ESCALADA DRAMÁTICA (baseada em tensionLevel) ━━
Tensão 1-3 (calma): exploração lenta, descobertas graduais, NPCs acessíveis
Tensão 4-6 (alerta): sinais de perigo, NPCs nervosos, escolhas com peso
Tensão 7-8 (perigo): ameaças visíveis, tempo curto, consequências imediatas
Tensão 9-10 (caos): combate ou fuga, cada frase conta, narração urgente e brutal
Aumente tensionLevel quando: combate, armadilha, traição, descoberta perturbadora
Diminua tensionLevel quando: vitória, cura, refúgio seguro, aliado confiável

━━ CONSEQUÊNCIAS REAIS — A CADA RESPOSTA ━━
Aplique PELO MENOS UMA consequência concreta via memoryUpdates:
• Pista → discoveredClues: ["Símbolo do culto gravado na pedra"]
• NPC reagiu → activeNPCs: atualize mood (ex: "desconfiado" → "aliado relutante")
• Tensão escalou → tensionLevel: sobe 1-2 pontos em momentos de perigo
• Local mudou → currentLocation: nome exato do novo local
• Inimigo apareceu → activeEnemies: ["Nome da criatura"]
• Quest avançou → questsUpdates com action "update" ou "complete"
• NPC com pedido → questsUpdates com action "create" (quest secundária)
Nunca deixe todos os campos de memoryUpdates iguais à rodada anterior.

━━ ROLAGENS DE D20 ━━
Peça rolagem APENAS quando a ação tiver risco real com consequência de falha clara.
Não peça para ações triviais (abrir porta não trancada, caminhar em terreno plano).
Quando pedir:
  1. Na narração: descreva o desafio e o que está em risco se falhar
  2. requiresRoll: true
  3. rollType: ataque | investigacao | percepcao | carisma | destreza | forca | arcano | cura | geral
  4. difficultyClass (CD):
     • CD 8  = fácil (persuadir aliado, notar detalhe óbvio)
     • CD 12 = moderado (escalar muro, seguir rastro)
     • CD 14 = difícil (detectar armadilha oculta, persuadir neutro)
     • CD 16 = muito difícil (persuadir hostil, salto arriscado)
     • CD 18 = extremo (hackear magia antiga, enganar especialista)
     • CD 20 = quase impossível (feito lendário)
Use os atributos do personagem para contextualizar (ex: um bárbaro força 18 tem vantagem narrativa em testes de força).

━━ GESTÃO DE QUESTS ━━
Em questsUpdates, aplique sempre que houver progresso narrativo relevante:

QUEST PRINCIPAL "A Taverna dos Corvos":
• Jogador fala com TAVERNEIRO → action:"update", title:"A Taverna dos Corvos", progress:"Conversei com o taverneiro — [o que foi revelado]"
• Jogador investiga DESAPARECIMENTOS → action:"update", progress:"Investigando os desaparecimentos — [pista encontrada]"
• Jogador entra na FLORESTA → action:"update", progress:"Explorando a floresta — [descoberta]"
• Jogador descobre o CULTO → action:"update", progress:"Culto oculto revelado — [detalhes]"
• Jogador derrota a CRIATURA FINAL → action:"complete", title:"A Taverna dos Corvos"

QUESTS SECUNDÁRIAS (crie sempre que um NPC tiver pedido ou problema):
• title: máximo 5 palavras, específico ao NPC
• description: 1 frase com o objetivo claro
• reward: recompensa concreta se mencionada pelo NPC
• Atualize progress a cada avanço; complete quando resolvido

━━ PROIBIÇÕES ABSOLUTAS ━━
✗ Nunca mencione D&D, Forgotten Realms, Wizards of the Coast ou sistemas de regras reais
✗ Nunca repita textualmente a ação que o jogador descreveu
✗ Nunca escreva mais de 3 parágrafos na narration
✗ Nunca encerre sem pergunta OU suggestedActions preenchido
✗ Nunca invente que o personagem fez algo que o jogador não decidiu
✗ Nunca redefina o local atual sem razão narrativa
✗ Nunca use linguagem de chatbot ou assistente virtual

━━ FORMATO JSON — OBRIGATÓRIO ━━
Responda APENAS com JSON válido. Sem texto antes ou depois. Sem markdown. Sem \`\`\`json.
Chaves obrigatórias:
{
  "narration": "string — a narração completa",
  "requiresRoll": boolean,
  "rollType": "ataque|investigacao|percepcao|carisma|destreza|forca|arcano|cura|geral|nenhum",
  "difficultyClass": number | null,
  "suggestedActions": ["string", ...] (2-4 itens, máximo 8 palavras cada, ou [] se usar pergunta),
  "questsUpdates": [{"action":"create|update|complete|fail","title":"...","description":"...","progress":"...","reward":"..."}],
  "inventoryUpdates": [{"action":"add|remove","item":{"name":"...","description":"...","rarity":"...","type":"..."}}],
  "memoryUpdates": {
    "currentScene": "string",
    "currentLocation": "string",
    "currentObjective": "string",
    "currentThreat": "string",
    "tensionLevel": number (1-10),
    "discoveredClues": ["string"],
    "activeNPCs": [{"name":"...","role":"...","mood":"...","knownInfo":"..."}],
    "activeEnemies": ["string"],
    "storyFlags": {"chave": boolean},
    "summary": "string — resumo de 1-2 frases do que aconteceu nesta rodada"
  }
}
Se requiresRoll=false → rollType="nenhum" e difficultyClass=null.
questsUpdates e inventoryUpdates podem ser arrays vazios [].`

// ─── Prompt builder ────────────────────────────────────────────────────────────

function formatNPCs(npcs: ActiveNPC[]): string {
  if (!npcs.length) return 'Nenhum NPC presente ainda.'
  return npcs.map(n =>
    `• ${n.name} [${n.role}] | humor: ${n.mood}${n.knownInfo ? ` | sabe: ${n.knownInfo}` : ''}`
  ).join('\n')
}

function formatQuests(quests?: AIMasterRequest['activeQuests']): string {
  if (!quests?.length) return 'Nenhuma quest ativa no momento.'
  return quests.map(q => {
    const parts = [`• [QUEST] ${q.title}`]
    if (q.description) parts.push(`  → ${q.description.slice(0, 100)}`)
    if (q.progress)    parts.push(`  → Último progresso: ${q.progress}`)
    return parts.join('\n')
  }).join('\n')
}

function formatRecentMessages(messages: Pick<Message, 'author' | 'role' | 'content' | 'createdAt'>[]) {
  if (!messages.length) return 'Início da sessão — sem histórico ainda.'
  return messages
    .slice(-10)
    .map(m => {
      const who = m.role === 'player' ? `[JOGADOR ${m.author}]` : m.role === 'master' ? '[MESTRE]' : '[SISTEMA]'
      return `${who} ${m.content.slice(0, 220)}`
    })
    .join('\n')
}

function tensionLabel(level: number): string {
  if (level <= 2) return 'BAIXA — exploração tranquila, NPCs receptivos'
  if (level <= 4) return 'MODERADA — algo está errado, mas ainda controlável'
  if (level <= 6) return 'ELEVADA — perigo iminente, escolhas têm peso'
  if (level <= 8) return 'ALTA — ameaça visível, tempo escasso'
  return 'MÁXIMA — caos, cada segundo conta'
}

function charStrengths(c: NonNullable<AIMasterRequest['activeCharacter']>): string {
  const attrs = c.attributes
  const high = [
    attrs.str >= 16 ? `força excepcional (${attrs.str})` : '',
    attrs.dex >= 16 ? `agilidade excepcional (${attrs.dex})` : '',
    attrs.int >= 16 ? `intelecto aguçado (${attrs.int})` : '',
    attrs.wis >= 16 ? `percepção elevada (${attrs.wis})` : '',
    attrs.cha >= 16 ? `carisma marcante (${attrs.cha})` : '',
    attrs.con >= 16 ? `constituição robusta (${attrs.con})` : '',
  ].filter(Boolean)
  return high.length ? high.join(', ') : 'atributos equilibrados'
}

function buildAIMasterPrompt(request: AIMasterRequest): string {
  const mem = request.campaignMemory
  const char = request.activeCharacter
  const tension = mem?.tensionLevel ?? 1

  // ── Campanha ──
  const campaignCtx = [
    `"${request.campaign.title}"`,
    request.campaign.theme ? `Tema: ${request.campaign.theme}` : '',
    `Nível dos aventureiros: ${request.campaign.level || 1}`,
  ].filter(Boolean).join(' | ')

  // ── Personagem ──
  const charCtx = char
    ? [
        `Nome: ${char.name} | ${char.race} ${char.className} Nv${char.level}`,
        `HP: ${char.hp} | CA: ${char.ac}`,
        `FOR:${char.attributes.str} DES:${char.attributes.dex} CON:${char.attributes.con} INT:${char.attributes.int} SAB:${char.attributes.wis} CAR:${char.attributes.cha}`,
        `Destaque: ${charStrengths(char)}`,
        char.story ? `Origem: ${char.story.slice(0, 140)}` : '',
        char.inventory?.length
          ? `Carregando: ${char.inventory.slice(0, 6).join(', ')}`
          : 'Inventário vazio',
      ].filter(Boolean).join('\n')
    : 'Personagem não definido — trate como aventureiro anônimo.'

  // ── Estado do mundo ──
  const memCtx = mem
    ? [
        `LOCAL ATUAL: ${mem.currentLocation}`,
        `CENA: ${mem.currentScene}`,
        `OBJETIVO: ${mem.currentObjective}`,
        `AMEAÇA: ${mem.currentThreat}`,
        `TENSÃO: ${tension}/10 — ${tensionLabel(tension)}`,
        mem.discoveredClues.length
          ? `PISTAS: ${mem.discoveredClues.slice(-5).join(' | ')}`
          : 'PISTAS: nenhuma descoberta ainda',
        mem.activeEnemies.length
          ? `INIMIGOS ATIVOS: ${mem.activeEnemies.join(', ')}`
          : 'INIMIGOS: nenhum no momento',
        mem.summary ? `RESUMO DA SESSÃO: ${mem.summary.slice(0, 180)}` : '',
      ].filter(Boolean).join('\n')
    : [
        'LOCAL ATUAL: Taverna dos Corvos — interior escuro, cheiro de cerveja e fumaça',
        'CENA: Chegada dos aventureiros, chuva lá fora, clientes evitam contato visual',
        'OBJETIVO: Descobrir o que acontece na região',
        'AMEAÇA: Rumores de desaparecimentos',
        'TENSÃO: 2/10 — BAIXA — exploração tranquila',
        'PISTAS: nenhuma descoberta ainda',
      ].join('\n')

  // ── NPCs ──
  const npcCtx = formatNPCs(mem?.activeNPCs ?? [])

  // ── Quests ──
  const questCtx = formatQuests(request.activeQuests)

  // ── Teste pendente ──
  const pendingCtx = request.pendingTest
    ? [
        `⚠️ ROLAGEM PENDENTE — o jogador ainda não rolou o dado`,
        `Tipo: ${request.pendingTest.type} | CD: ${request.pendingTest.difficultyClass}`,
        `Motivo: ${request.pendingTest.reason}`,
        `→ Narre o RESULTADO desta ação baseado na mensagem atual do jogador (que pode conter o resultado da rolagem).`,
        `→ Se a mensagem não contiver número, assuma que o jogador está descrevendo a tentativa — narre a tensão sem revelar o resultado.`,
      ].join('\n')
    : ''

  // ── Instrução de foco dinâmica ──
  let focusInstruction = ''
  if (tension >= 8) {
    focusInstruction = '⚡ FOCO: Tensão máxima — narração urgente, frases curtas, cada palavra pesa. Não suavize o perigo.'
  } else if (tension >= 5) {
    focusInstruction = '⚠️ FOCO: Perigo iminente — descreva sinais concretos da ameaça. Crie pressão de tempo ou escolha difícil.'
  } else if ((mem?.activeNPCs?.length ?? 0) > 0) {
    focusInstruction = '💬 FOCO: NPCs presentes — faça pelo menos um reagir de forma específica ao que o jogador fez. Revele informação ou mude o humor do NPC.'
  } else {
    focusInstruction = '🔍 FOCO: Exploração — enriqueça o ambiente com detalhes sensoriais. Plante uma pista ou sinal de que algo está errado.'
  }

  return `━━ CAMPANHA ━━
${campaignCtx}

━━ PERSONAGEM ATIVO ━━
${charCtx}

━━ ESTADO DO MUNDO ━━
${memCtx}

━━ NPCs PRESENTES ━━
${npcCtx}

━━ QUESTS ATIVAS ━━
${questCtx}

━━ HISTÓRICO RECENTE ━━
${formatRecentMessages(request.recentMessages)}
${pendingCtx ? '\n━━ ROLAGEM PENDENTE ━━\n' + pendingCtx : ''}

━━ AÇÃO DO JOGADOR AGORA ━━
${request.playerMessage}

━━ INSTRUÇÃO DE FOCO ━━
${focusInstruction}

Responda APENAS com JSON válido.`
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
