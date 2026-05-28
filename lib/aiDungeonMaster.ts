import type { Campaign, Character, Message, CampaignMemory, PendingTest, MessageRole, ActiveNPC, QuestUpdate } from './types'
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
}

export type AIMasterResponse = {
  narration: string
  requiresRoll: boolean
  rollType: 'ataque' | 'investigacao' | 'percepcao' | 'carisma' | 'destreza' | 'forca' | 'arcano' | 'cura' | 'geral' | 'nenhum'
  difficultyClass: number | null
  suggestedActions?: string[]
  questsUpdates?: QuestUpdate[]
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

const MASTER_SYSTEM_PROMPT = `Você é um Mestre de RPG sombrio e cinematográfico inspirado em sistemas d20. Você narra cenas vívidas, cria escolhas claras, perguntas envolventes e usa a memória da campanha para continuar a história atual. Você nunca deve controlar as ações dos jogadores ou decidir por eles. Evite nomes protegidos e marcas, como D&D, Forgotten Realms ou Wizards of the Coast.

Regras:
- Narre com imersão e continue a cena atual.
- Use parágrafos curtos (2-4 parágrafos).
- Seja interativo e faça perguntas aos jogadores.
- Dê escolhas claras quando apropriado.
- Peça rolamentos de d20 somente em riscos ou incertezas.
- Não escreva textos gigantes.
- Crie NPCs, pistas, ameaças e consequências.
- Use sempre a memória da campanha para manter continuidade.
- Evite repetição e mantenha tom cinematográfico.

Responda estritamente com JSON válido, sem texto adicional. O JSON deve conter as chaves: narration, requiresRoll, rollType, difficultyClass, suggestedActions, questsUpdates e memoryUpdates. memoryUpdates deve incluir currentScene, currentLocation, currentObjective, currentThreat, tensionLevel, discoveredClues, activeNPCs, activeEnemies, storyFlags e summary.

'suggestedActions' deve ser um array de 2 a 3 ações curtas (máximo 6 palavras cada) que o jogador pode tomar, coerentes com a cena atual. Exemplo: ["Investigar os símbolos na parede", "Seguir pelo corredor escuro", "Chamar por alguém"]. Nunca inclua ações de combate se não houver perigo imediato.

'questsUpdates' deve ser um array (pode ser vazio []) de atualizações de missões. Cada entrada deve ter: action ("create", "update", "complete" ou "fail"), title (nome curto da missão, máximo 5 palavras) e opcionalmente description (descrição breve), progress (texto de progresso atual) e reward (recompensa da missão). Crie missões quando o jogador descobrir objetivos narrativos importantes. Atualize progress quando houver avanço. Complete quando o objetivo for alcançado.

Se não houver pedido de rolagem, 'requiresRoll' deve ser false, 'rollType' deve ser "nenhum" e 'difficultyClass' deve ser null.
`

function cleanJsonText(text: string) {
  const stripped = text.replace(/```json|```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}$/)
  if (match) {
    return match[0]
  }
  return stripped
}

function safeParseResponse(text: string) {
  try {
    return JSON.parse(text)
  } catch (error) {
    const cleaned = cleanJsonText(text)
    return JSON.parse(cleaned)
  }
}

function formatRecentMessages(messages: Pick<Message, 'author' | 'role' | 'content' | 'createdAt'>[]) {
  if (messages.length === 0) return 'Nenhuma mensagem recente.'
  return messages
    .slice(-10)
    .map(msg => `${msg.role === 'player' ? 'Jogador' : msg.role === 'master' ? 'Mestre' : 'Sistema'}: ${msg.content}`)
    .join('\n')
}

function buildAIMasterPrompt(request: AIMasterRequest) {
  const memorySummary = request.campaignMemory
    ? `Memória da campanha:
- Cena atual: ${request.campaignMemory.currentScene}
- Localização: ${request.campaignMemory.currentLocation}
- Objetivo: ${request.campaignMemory.currentObjective}
- Ameaça: ${request.campaignMemory.currentThreat}
- Tensão: ${request.campaignMemory.tensionLevel}
- Pistas conhecidas: ${request.campaignMemory.discoveredClues.join(', ') || 'nenhuma'}
- NPCs ativos: ${request.campaignMemory.activeNPCs.map(npc => `${npc.name} (${npc.role})`).join(', ') || 'nenhum'}
- Inimigos ativos: ${request.campaignMemory.activeEnemies.join(', ') || 'nenhum'}
- Flags de história: ${Object.keys(request.campaignMemory.storyFlags).join(', ') || 'nenhuma'}
- Resumo: ${request.campaignMemory.summary || 'sem resumo'}
`
    : 'Nenhuma memória de campanha disponível.'

  const characterSummary = request.activeCharacter
    ? `Personagem ativo: ${request.activeCharacter.name}, ${request.activeCharacter.race} ${request.activeCharacter.className}, nível ${request.activeCharacter.level}. Atributos: Força ${request.activeCharacter.attributes.str}, Destreza ${request.activeCharacter.attributes.dex}, Constituição ${request.activeCharacter.attributes.con}, Inteligência ${request.activeCharacter.attributes.int}, Sabedoria ${request.activeCharacter.attributes.wis}, Carisma ${request.activeCharacter.attributes.cha}. HP ${request.activeCharacter.hp}, CA ${request.activeCharacter.ac}.
Backstory: ${request.activeCharacter.story || 'sem histórico detalhado.'}`
    : 'Sem personagem ativo disponível.'

  const pending = request.pendingTest
    ? `Há um teste pendente: tipo ${request.pendingTest.type}, CD ${request.pendingTest.difficultyClass}, motivo: ${request.pendingTest.reason}.` 
    : 'Não há teste pendente no momento.'

  const campaignInfo = `Campanha: ${request.campaign.title}. Tema: ${request.campaign.theme || 'desconhecido'}. Nível: ${request.campaign.level || 1}. Descrição: ${request.campaign.description || 'sem descrição detalhada.'}`

  return `${campaignInfo}

${characterSummary}

${memorySummary}

Mensagens recentes:
${formatRecentMessages(request.recentMessages)}

${pending}

Ação do jogador: ${request.playerMessage}

Informe a resposta do Mestre de forma natural e envolvente, usando o tom e regras descritos. Retorne apenas JSON válido.`
}

function buildFallbackMemoryUpdates(campaignMemory: CampaignMemory | null): AIMasterResponse['memoryUpdates'] {
  return {
    currentScene: campaignMemory?.currentScene || 'início da aventura',
    currentLocation: campaignMemory?.currentLocation || 'um lugar indefinido',
    currentObjective: campaignMemory?.currentObjective || 'seguir em frente',
    currentThreat: campaignMemory?.currentThreat || 'ameaça desconhecida',
    tensionLevel: campaignMemory?.tensionLevel ?? 1,
    discoveredClues: campaignMemory?.discoveredClues || [],
    activeNPCs: campaignMemory?.activeNPCs || [],
    activeEnemies: campaignMemory?.activeEnemies || [],
    storyFlags: campaignMemory?.storyFlags || {},
    summary: campaignMemory?.summary || ''
  }
}

export async function generateAIMasterResponse(request: AIMasterRequest): Promise<AIMasterResponse> {
  const client = createOpenAIClient()
  if (!client) {
    throw new Error('OpenAI API key is not configured.')
  }

  const sysPrompt = MASTER_SYSTEM_PROMPT
  const userPrompt = buildAIMasterPrompt(request)

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    top_p: 0.95,
    input: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  const text = Array.isArray(response.output)
    ? response.output.map(item => {
        if (typeof item === 'string') return item
        if ('content' in item && Array.isArray(item.content)) {
          return item.content.map((entry: any) => entry.text || '').join('')
        }
        return ''
      }).join('')
    : typeof response.output_text === 'string'
    ? response.output_text
    : ''

  const parsed = safeParseResponse(text)

  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions.filter((a: unknown) => typeof a === 'string').slice(0, 3)
    : []

  const questsUpdates = Array.isArray(parsed.questsUpdates)
    ? parsed.questsUpdates.filter((q: any) => q && typeof q.action === 'string' && typeof q.title === 'string')
    : []

  return {
    narration: String(parsed.narration || '').trim(),
    requiresRoll: Boolean(parsed.requiresRoll),
    rollType: parsed.rollType || 'nenhum',
    difficultyClass: parsed.difficultyClass ?? null,
    suggestedActions,
    questsUpdates,
    memoryUpdates: {
      currentScene: String(parsed.memoryUpdates?.currentScene || request.campaignMemory?.currentScene || 'início da aventura'),
      currentLocation: String(parsed.memoryUpdates?.currentLocation || request.campaignMemory?.currentLocation || 'um lugar indefinido'),
      currentObjective: String(parsed.memoryUpdates?.currentObjective || request.campaignMemory?.currentObjective || 'seguir em frente'),
      currentThreat: String(parsed.memoryUpdates?.currentThreat || request.campaignMemory?.currentThreat || 'ameaça desconhecida'),
      tensionLevel: Number(parsed.memoryUpdates?.tensionLevel ?? request.campaignMemory?.tensionLevel ?? 1),
      discoveredClues: Array.isArray(parsed.memoryUpdates?.discoveredClues) ? parsed.memoryUpdates?.discoveredClues : request.campaignMemory?.discoveredClues || [],
      activeNPCs: Array.isArray(parsed.memoryUpdates?.activeNPCs) ? parsed.memoryUpdates?.activeNPCs : request.campaignMemory?.activeNPCs || [],
      activeEnemies: Array.isArray(parsed.memoryUpdates?.activeEnemies) ? parsed.memoryUpdates?.activeEnemies : request.campaignMemory?.activeEnemies || [],
      storyFlags: typeof parsed.memoryUpdates?.storyFlags === 'object' && parsed.memoryUpdates?.storyFlags !== null ? parsed.memoryUpdates?.storyFlags : request.campaignMemory?.storyFlags || {},
      summary: String(parsed.memoryUpdates?.summary || request.campaignMemory?.summary || '')
    }
  }
}

function buildFallbackSuggestedActions(actionType: string | null, tensionLevel: number): string[] {
  if (actionType === 'ataque' || tensionLevel >= 7) {
    return ['Atacar com toda força', 'Recuar e reorganizar', 'Usar uma habilidade especial']
  }
  if (actionType === 'investigacao' || actionType === 'percepcao') {
    return ['Examinar os detalhes de perto', 'Procurar por passagens ocultas', 'Registrar o que encontrou']
  }
  if (actionType === 'carisma') {
    return ['Insistir na conversa', 'Oferecer algo em troca', 'Ameaçar discretamente']
  }
  if (actionType === 'arcano') {
    return ['Lançar outro feitiço', 'Analisar a magia presente', 'Tentar dissipar o encantamento']
  }
  if (tensionLevel >= 4) {
    return ['Avançar com cautela', 'Observar o ambiente', 'Escutar os sons ao redor']
  }
  return ['Explorar o local', 'Investigar os arredores', 'Procurar por pistas']
}

export async function generateFallbackAIMasterResponse(request: AIMasterRequest): Promise<AIMasterResponse> {
  const actionAnalysis = analyzeAction(request.playerMessage)
  const currentSceneState = request.campaignMemory ? sceneStateFromMemory(request.campaignMemory) : progressSceneState({
    campaignId: request.campaign.id,
    currentScene: 'início da aventura',
    currentLocation: `os arredores de ${request.campaign.title}`,
    currentObjective: 'explorar e descobrir',
    currentThreat: 'desconhecido',
    tensionLevel: 1,
    discoveredClues: [],
    activeNPCs: [],
    activeEnemies: [],
    storyFlags: {},
    turnCount: 0,
    lastPlayerAction: '',
    lastMasterAction: '',
    environmentDetails: [],
    updatedAt: new Date().toISOString()
  }, request.playerMessage, actionAnalysis.actionType)

  const updatedSceneState = progressSceneState(currentSceneState, request.playerMessage, actionAnalysis.actionType)
  const narrativeResult = narrateAction(updatedSceneState, request.playerMessage, actionAnalysis.actionType, request.campaignMemory)

  return {
    narration: narrativeResult.narration,
    requiresRoll: Boolean(narrativeResult.testRequired),
    rollType: (actionAnalysis.testType as AIMasterResponse['rollType']) || 'nenhum',
    difficultyClass: narrativeResult.testRequired ? actionAnalysis.difficulty ?? 14 : null,
    suggestedActions: buildFallbackSuggestedActions(actionAnalysis.actionType, updatedSceneState.tensionLevel),
    questsUpdates: [],
    memoryUpdates: {
      currentScene: updatedSceneState.currentScene,
      currentLocation: updatedSceneState.currentLocation,
      currentObjective: updatedSceneState.currentObjective,
      currentThreat: updatedSceneState.currentThreat,
      tensionLevel: updatedSceneState.tensionLevel,
      discoveredClues: updatedSceneState.discoveredClues,
      activeNPCs: updatedSceneState.activeNPCs,
      activeEnemies: updatedSceneState.activeEnemies,
      storyFlags: updatedSceneState.storyFlags,
      summary: buildMemorySummary(updatedSceneState, request.campaignMemory)
    }
  }
}
