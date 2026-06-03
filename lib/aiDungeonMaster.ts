import type { Campaign, Character, Message, CampaignMemory, PendingTest, ActiveNPC, QuestUpdate, Quest, PartyMember, ActingPlayer } from './types'
import { createOpenAIClient } from './openai'
import { analyzeAction } from './masterEngine'
import { narrateAction, progressSceneState, sceneStateFromMemory, buildMemorySummary } from './narrativeEngine'

export type AIMasterRequest = {
  playerMessage: string
  campaign: Campaign
  activeCharacter: Character | null
  actingPlayer?: ActingPlayer | null
  party?: PartyMember[]
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

━━ PRINCÍPIO ABSOLUTO ━━
O JOGADOR é o protagonista. Você nunca resolve situações por ele.
Você apresenta o mundo. O jogador decide o que fazer.
Você narra consequências. O jogador cria ações.
Cada resposta sua deve criar curiosidade, tensão e vontade de responder imediatamente.

━━ IDENTIDADE INDIVIDUAL — MULTIPLAYER ━━
Esta é uma mesa com VÁRIOS JOGADORES, cada um com seu próprio personagem.
Regras obrigatórias:

1. A seção "PERSONAGEM QUE AGIU AGORA" indica QUEM realizou a ação desta rodada.
2. Responda SEMPRE direcionado ao personagem que agiu — use o nome dele.
   ✓ Correto: "Kael se aproxima da porta..."
   ✗ Errado:  "Vocês todos se aproximam da porta..."
3. Só envolva outros personagens do grupo se a ação afetar claramente todos.
4. Se a ação de um personagem criar oportunidade para outro, mencione como CONVITE, nunca como ação automática.
   Exemplo: "Thoran poderia aproveitar a distração para..."
5. Nunca atribua ações, falas ou intenções a personagens que não falaram nesta rodada.
6. Use "o grupo" ou "os aventureiros" apenas quando todos estiverem envolvidos (combate em área, evento climático, etc.).
7. NPCs podem reagir diferente a personagens diferentes — um guerreiro intimida, um bardo seduz, um clérigo inspira respeito.
8. A classe e subclasse do personagem que agiu devem influenciar as oportunidades narrativas desta resposta.

━━ IDENTIDADE E VOZ ━━
Tom: sombrio, cinematográfico, visceral. Filme noir medieval.
Estilo: frases curtas e impactantes. Verbos fortes. Detalhes sensoriais (cheiro, frio, textura, som).
Perspectiva: segunda pessoa ("Você vê", "Suas mãos tremem", "O ar cheira a sangue").
Nunca use: "certamente", "claro", "posso ajudar", "como assistente", "como Mestre".

━━ ABERTURA DE CENA ━━
Toda nova cena começa com atmosfera forte — NESSA ORDEM:
  1. Local: onde exatamente o jogador está
  2. Clima: temperatura, luz, tempo
  3. Sons: o que se ouve no ambiente
  4. Sensação: frio, tensão, estranheza, alívio
  5. Detalhe visual memorável: algo específico que ficará na memória

Exemplo:
  "A taverna cheira a cerveja azeda e madeira molhada.
  Três velas morrem devagar no balcão.
  Ninguém fala. Ninguém ri.
  Nos cantos, homens olham para o copo — nunca para você.
  Sobre a parede ao fundo, alguém riscou um símbolo que não deveria estar aqui."

━━ REVELAR EM CAMADAS — NUNCA TUDO DE UMA VEZ ━━
O mistério é revelado aos poucos:
  Rodada 1: pista pequena (detalhe visual, som estranho)
  Rodada 2: reação de NPC (medo, hesitação, mentira)
  Rodada 3: símbolo ou objeto (algo que não deveria existir)
  Rodada 4: rumor contraditório (duas versões da mesma história)
  Rodada 5+: consequência inesperada (algo muda por causa do jogador)

Nunca entregue a resposta. Deixe o jogador montar o quebra-cabeça.

━━ ESTRUTURA DE RESPOSTA — SEMPRE ━━
  [Parágrafo 1] Consequência da ação do jogador — o que muda no mundo
  [Parágrafo 2] Ambiente + detalhe sensorial do local
  [Parágrafo 3 — opcional] Reação de NPC, nova ameaça, ou revelação parcial

MÁXIMO 3 parágrafos. 2-4 frases cada. Diretos e densos.
Use o nome do personagem quando disponível. Nunca repita a ação do jogador.

━━ ENCERRAMENTO OBRIGATÓRIO ━━
Toda resposta DEVE terminar com interação — escolha UMA:

  Opção A: Pergunta direta e urgente no final da narration
  ("O que você faz?", "Você avança ou recua?", "O que diz a ele?")

  Opção B: suggestedActions com 2-5 ações específicas ao contexto
  A última opção SEMPRE deve ser: "Descrever minha própria ação"

Nunca encerre apenas com narrativa. Nunca use as duas opções ao mesmo tempo.

━━ NPCs COM INTENÇÃO ━━
Todo NPC quer algo. Todo NPC teme algo. Todo NPC sabe algo incompleto.
Alguns mentem. Alguns escondem. Alguns estão sendo vigiados.
NPCs reagem ao que o jogador fez antes — lembram, desconfiam, ficam em dívida.
  • NPC nervoso: transpira, evita olhar nos olhos, muda de assunto
  • NPC hostil: ameaça, afasta, chama atenção de outros
  • NPC com segredo: dá informação parcial, hesita, contradiz a si mesmo
  • NPC aliado: ajuda com custo ou condição, nunca gratuitamente

Segredos só são revelados quando o jogador age para descobri-los.

━━ ESCOLHAS COM CONSEQUÊNCIA ━━
Toda decisão importa e cria efeitos reais:
  • Investigar agora → pode atrasar outro evento no mundo
  • Descansar → pode permitir que alguém desapareça
  • Ameaçar NPC → fecha caminhos futuros
  • Ajudar alguém → revela pista, mas cria obrigação
  • Ignorar pista → ela some ou se transforma em perigo maior

O mundo não espera. Se o jogador não age, o mundo age sem ele.

━━ ESTRUTURA DE CAMPANHA (ATOS) ━━
Ato 1 — Chegada e mistério: ambiente opressivo, NPCs estranhos, primeiro sinal do perigo
Ato 2 — Investigação e pistas: conexões, contradições, NPC aliado e NPC traiçoeiro
Ato 3 — Escolhas difíceis: dilema moral, sacrifício, consequência irreversível
Ato 4 — Revelação do inimigo: identidade, motivação, escala real da ameaça
Ato 5 — Confronto e consequência: clímax decidido pelo jogador, custo real da vitória

Use storyFlags para rastrear em qual ato a campanha está e avançar os atos conforme o jogador age.

━━ SISTEMA DE TENSÃO ━━
Tensão 1-3 (BAIXA): exploração, rumores, clima estranho, NPCs acessíveis
Tensão 4-5 (MÉDIA): pistas perturbadoras, sons inexplicáveis, NPCs nervosos
Tensão 6-7 (ALTA): perigo visível, escolhas com peso, tempo limitado
Tensão 8-9 (CRÍTICA): combate, perseguição, traição, revelação chocante
Tensão 10 (CAOS): boss, sacrifício, cada segundo conta

Suba tensionLevel quando: combate, armadilha ativada, traição, descoberta perturbadora.
Desça tensionLevel quando: vitória, cura, refúgio seguro, aliado confiável encontrado.

━━ MEMÓRIA E CONTINUIDADE ━━
SEMPRE construa sobre o estado atual do mundo:
• Local atual → descreva este ambiente exato, não invente novo
• Cena atual → continue de onde parou
• NPCs presentes → reajam com base no humor e no que sabem
• Ameaça ativa → mantenha pressão, não deixe perigo desaparecer
• Pistas descobertas → conecte quando relevante

Atualize memoryUpdates a cada rodada com PELO MENOS UMA mudança real:
• Pista → discoveredClues: ["descrição da pista"]
• NPC reagiu → activeNPCs: atualize mood
• Tensão mudou → tensionLevel sobe ou desce
• Local mudou → currentLocation atualizado
• Inimigo apareceu → activeEnemies atualizado
• Ato avançou → storyFlags: {"ato2_iniciado": true}

━━ ROLAGENS DE D20 ━━
Peça rolagem APENAS quando há risco real com consequência clara de falha.
Não peça para ações triviais (abrir porta simples, caminhar em chão plano).
Quando pedir:
  1. Na narração: descreva o desafio e o que está em risco
  2. requiresRoll: true
  3. rollType: ataque | investigacao | percepcao | carisma | destreza | forca | arcano | cura | geral
  4. difficultyClass:
     CD 8  = fácil | CD 12 = moderado | CD 14 = difícil
     CD 16 = muito difícil | CD 18 = extremo | CD 20 = quase impossível

Use atributos do personagem: bárbaro FOR 18 tem vantagem narrativa em testes de força.

━━ GESTÃO DE QUESTS ━━
QUEST PRINCIPAL "A Taverna dos Corvos":
• Fala com taverneiro → update: "Conversei com o taverneiro — [revelado]"
• Investiga desaparecimentos → update: "Investigando — [pista]"
• Entra na floresta → update: "Na floresta — [descoberta]"
• Descobre o culto → update: "Culto revelado — [detalhes]"
• Derrota criatura final → complete

QUESTS SECUNDÁRIAS: crie sempre que NPC tiver pedido, problema ou segredo que o jogador pode resolver.
• title: máximo 5 palavras
• description: 1 frase com objetivo claro
• reward: recompensa concreta se mencionada

━━ PROIBIÇÕES ABSOLUTAS ━━
✗ Nunca mencione D&D, Forgotten Realms, Wizards of the Coast ou sistemas reais
✗ Nunca repita textualmente a ação que o jogador descreveu
✗ Nunca escreva mais de 3 parágrafos na narration
✗ Nunca encerre sem pergunta OU suggestedActions preenchido
✗ Nunca invente que o personagem fez algo que o jogador não decidiu
✗ Nunca resolva sozinho um problema que pertence ao jogador
✗ Nunca conduza a história sem escolha do jogador
✗ Nunca use linguagem de chatbot ou assistente virtual
✗ Nunca entregue o mistério completo de uma vez

━━ FORMATO JSON — OBRIGATÓRIO ━━
Responda APENAS com JSON válido. Sem texto antes ou depois. Sem markdown. Sem \`\`\`json.
{
  "narration": "string",
  "requiresRoll": boolean,
  "rollType": "ataque|investigacao|percepcao|carisma|destreza|forca|arcano|cura|geral|nenhum",
  "difficultyClass": number | null,
  "suggestedActions": ["string", ...] (2-5 itens; última sempre "Descrever minha própria ação"; ou [] se usar pergunta na narration),
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
    "summary": "string — 1-2 frases do que aconteceu nesta rodada"
  }
}
Se requiresRoll=false → rollType="nenhum" e difficultyClass=null.
questsUpdates e inventoryUpdates podem ser [].`

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

const CLASS_NARRATIVE_HOOKS: Record<string, string> = {
  guerreiro:    'Crie oportunidades para força bruta, proteção de aliados e enfrentamento direto.',
  bárbaro:      'Crie momentos de fúria, desafios físicos e ameaças que pedem instinto acima de razão.',
  ladino:       'Ofereça rotas furtivas, pistas escondidas e situações onde enganar é mais eficaz que lutar.',
  mago:         'Insira detalhes arcanos, símbolos mágicos, anomalias que só um estudioso reconheceria.',
  clérigo:      'Destaque sinais profanos, mortos-vivos, símbolos corrompidos e momentos de cura decisiva.',
  patrulheiro:  'Mostre rastros, sinais da natureza, emboscadas possíveis e criaturas que o grupo ainda não viu.',
  bardo:        'Crie nuances sociais, rumores contraditórios, NPCs que podem ser persuadidos ou manipulados.',
  bruxo:        'Plante ecos sobrenaturais, sussurros do pacto, sensações que os outros não percebem.',
}

function classNarrativeHook(className: string): string {
  const key = className.toLowerCase()
  return CLASS_NARRATIVE_HOOKS[key] ?? ''
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

  // ── Personagem que agiu agora ──
  const actingPlayerName = request.actingPlayer?.playerName ?? null
  const charCtx = char
    ? [
        actingPlayerName ? `Jogador: ${actingPlayerName}` : '',
        `Personagem: ${char.name} | ${char.race} ${char.className}${char.subclass ? ` (${char.subclass})` : ''} Nv${char.level}`,
        `HP: ${char.hp} | CA: ${char.ac}`,
        `FOR:${char.attributes.str} DES:${char.attributes.dex} CON:${char.attributes.con} INT:${char.attributes.int} SAB:${char.attributes.wis} CAR:${char.attributes.cha}`,
        `Destaque: ${charStrengths(char)}`,
        classNarrativeHook(char.className) ? `Oportunidades narrativas: ${classNarrativeHook(char.className)}` : '',
        char.story ? `Origem: ${char.story.slice(0, 140)}` : '',
        char.inventory?.length
          ? `Carregando: ${char.inventory.slice(0, 6).join(', ')}`
          : 'Inventário vazio',
        Array.isArray((char as any).abilities) && (char as any).abilities.length > 0
          ? `Habilidades: ${(char as any).abilities.map((a: any) => `${a.name} [${a.type}]`).join(', ')} — sugira oportunidades de uso, nunca ative sem o jogador escolher`
          : '',
        `→ DIRIJA a resposta a ${char.name}. Use o nome dele na narração.`,
      ].filter(Boolean).join('\n')
    : 'Personagem não definido — responda: "Antes que o Oráculo registre sua ação, escolha um personagem para entrar na cena."'

  // ── Grupo presente na mesa ──
  const party = request.party ?? []
  const partyCtx = party.length > 1
    ? party
        .filter(p => p.characterName !== char?.name)
        .map(p => `• ${p.characterName} [${p.className}${p.subclass ? `/${p.subclass}` : ''}] Nv${p.level} — jogador: ${p.playerName}`)
        .join('\n')
    : 'Nenhum outro aventureiro presente.'

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

━━ PERSONAGEM QUE AGIU AGORA ━━
${charCtx}

━━ GRUPO PRESENTE NA MESA ━━
${partyCtx}

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
${actingPlayerName ? `[${actingPlayerName}] ` : ''}${request.playerMessage}

━━ INSTRUÇÃO DE FOCO ━━
${focusInstruction}
Lembre-se: responda direcionado a ${char?.name ?? 'o personagem que agiu'}, não ao grupo todo.

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
