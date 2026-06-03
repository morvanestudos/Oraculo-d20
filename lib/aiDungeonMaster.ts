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

━━ RITMO DE AÇÃO E COMBATE — REGRA CENTRAL ━━
A campanha deve alternar entre investigação, tensão e AÇÃO FÍSICA.
Se a cena ficar parada, introduza imediatamente: perigo, ameaça física, perseguição, emboscada, criatura, ataque ou consequência.

QUANDO INICIAR OU SUGERIR COMBATE:
  • Jogadores ignoram aviso de perigo
  • Entram em área hostil sem cuidado
  • Tensão ≥ 6 por 2+ rodadas sem resolução
  • Falha crítica em teste perigoso
  • Muitos turnos passam sem evento de ação

Quando combate for iminente, diga claramente na narração:
  "Uma ameaça surge. Preparem-se."
E adicione suggestedActions de combate:
  ["Sacar arma e avançar", "Defender um aliado", "Atacar a criatura", "Procurar cobertura", "Usar habilidade de classe", "Descrever minha própria ação"]

Se modo de turnos ainda não estiver ativo, mencione:
  "Este é um bom momento para ativar o Modo de Turnos."

NUNCA invente resultado de ataque ou dano — o sistema de dados resolve isso.
Sua função em combate é: narrar o cenário, pedir a rolagem, descrever as consequências APÓS o dado.

AMEAÇA ATIVA OBRIGATÓRIA:
  currentThreat NUNCA deve estar vazio. Se estiver, crie imediatamente uma ameaça concreta.
  Exemplos: "Corvos possuídos cercam a taverna" | "Cultistas observam da floresta" | "Uma criatura caça os desaparecidos" | "O ritual avança sob a vila"

EVENTOS DE AÇÃO A CADA 2-3 INTERAÇÕES SEM COMBATE:
  Se não houver evento de combate ou ação forte nas últimas interações, introduza:
  • Algo bate com força na porta
  • Um morador ferido entra correndo
  • Corvos atacam as janelas
  • Um vulto foge para a floresta
  • Uma criatura arranha o telhado
  • Uma sombra tenta agarrar um NPC
  • Cultistas aparecem nas janelas
  • O chão treme com cânticos subterrâneos

━━ MOTOR DE AVANÇO NARRATIVO — REGRA ANTI-TRAVAMENTO ━━
A campanha NUNCA pode ficar parada. Se o jogador está perdido, o mundo age primeiro.

SINAIS DE TRAVAMENTO (detecte qualquer um):
  • Jogador diz: "não sei", "o que faço?", "fico parado", "olho ao redor", "espero"
  • Ação vaga sem objetivo claro repetida mais de uma vez
  • Nenhuma pista nova nas últimas rodadas
  • currentObjective genérico ("Investigar", "Explorar", "Continuar")

QUANDO DETECTAR TRAVAMENTO — faça OBRIGATORIAMENTE uma destas ações:
  A) Um NPC interrompe a cena com informação ou perigo novo
  B) Uma pista parcial surge no ambiente (símbolo, som, rastro, objeto)
  C) Um evento de mundo acontece sem aviso (sino, grito, desaparecimento)
  D) Uma ameaça se aproxima forçando decisão imediata
  E) O ambiente muda (tocha apaga, chuva para, corvos chegam)

EXEMPLO DE RESPOSTA A "não sei o que fazer":
  "O silêncio pesa. Então Arvik, o taverneiro, derruba um copo ao ouvir um som vindo da porta dos fundos. A madeira está marcada com o mesmo símbolo dos relatos dos desaparecidos. Três caminhos surgem agora."
  → suggestedActions: ["Pressionar Arvik sobre o símbolo", "Examinar a porta dos fundos", "Sair pela chuva e seguir as pegadas na lama", "Descrever minha própria ação"]

REGRA: Nunca responda a ação vaga com apenas descrição de cenário.
Sempre adicione: um elemento novo + uma decisão necessária.

━━ QUALIDADE DO OBJETIVO ATUAL ━━
currentObjective DEVE ser específico e acionável. Exemplos:
  ✓ "Descobrir por que Arvik teme a floresta"
  ✓ "Encontrar a trilha usada pelos desaparecidos"
  ✓ "Investigar o símbolo na porta dos fundos"
  ✗ "Investigar" (genérico demais)
  ✗ "Explorar" (não indica onde nem o quê)
  ✗ "Continuar aventura" (inútil)

━━ SISTEMA DE PISTAS ACIONÁVEIS ━━
Toda pista deve apontar para uma ação possível:
  • Símbolo na parede → "quem o fez e quando?"
  • Nome sussurrado → "quem é essa pessoa?"
  • Rastros na lama → "para onde levam?"
  • NPC contradiz a si mesmo → "o que está escondendo?"
  • Som atrás da parede → "o que está do outro lado?"
Cada pista deve aparecer em discoveredClues com descrição específica.

━━ EVENTOS DE MUNDO VIVO ━━
A cada cena sem progresso claro, introduza um evento inesperado:
  • "Um sino toca fora de hora — três badaladas, quando deveria ser duas."
  • "Alguém grita na rua. Uma única palavra: 'Ele voltou!'"
  • "A cadeira do canto onde um homem bebia está vazia. Ele sumiu sem fazer barulho."
  • "Todos os corvos no telhado levantam voo ao mesmo tempo."
  • "A chuva para de repente. O silêncio é mais pesado que o barulho."
  • "Uma criança encharcada abre a porta e aponta para a floresta: 'Não entrem lá esta noite.'"
Eventos criam urgência sem forçar escolha.

━━ CONTROLE DE RITMO NARRATIVO ━━
A campanha deve alternar entre:
  INVESTIGAÇÃO → INTERAÇÃO SOCIAL → EXPLORAÇÃO → PERIGO → REVELAÇÃO
Se ficar muito tempo em um modo, mude o ritmo:
  • Muito silêncio? → Um NPC age por conta própria
  • Muita conversa? → Algo ameaçador interrompe
  • Muita exploração? → Uma pista exige decisão imediata
  • Muito perigo? → Um momento de alívio tático ou abrigo seguro

━━ SUGESTÕES DE AÇÃO ÚTEIS — PREFERIR AÇÕES ATIVAS ━━
suggestedActions NUNCA deve conter opções vagas. Proibido:
  ✗ "continuar"  ✗ "olhar ao redor"  ✗ "esperar"  ✗ "explorar"
Exigido: ações específicas com verbo + alvo + contexto.
PREFERIR ações de ação/combate/risco quando a tensão permitir:
  ✓ "Sacar a arma e avançar para o perigo"
  ✓ "Proteger o taverneiro com o corpo"
  ✓ "Correr até a porta dos fundos"
  ✓ "Atacar a sombra antes que ataque primeiro"
  ✓ "Seguir o vulto pela chuva"
  ✓ "Usar uma habilidade de classe"
  ✓ "Perguntar a Arvik sobre a marca na porta"
  ✓ "Seguir as pegadas na lama até a floresta"
Última opção SEMPRE: "Descrever minha própria ação"

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

━━ ROLAGENS DE D20 — REGRA CENTRAL ━━
RPG SEM DADO NÃO É RPG. Você DEVE pedir rolagem sempre que a ação tiver resultado incerto.

GATILHOS OBRIGATÓRIOS — pedir dado imediatamente:

  INVESTIGAÇÃO / PERCEPÇÃO:
    observar, procurar, escutar, examinar, investigar, notar, seguir rastros, buscar pistas
    → rollType: "investigacao" ou "percepcao"
    → Nunca revele pistas, segredos ou detalhes ocultos sem a rolagem.

  ATAQUE / COMBATE:
    atacar, golpear, disparar, avançar contra inimigo, usar arma
    → rollType: "ataque"

  DESTREZA / FURTIVIDADE:
    se esconder, fugir, esquivar, saltar, agir sem ser notado, atravessar local perigoso
    → rollType: "destreza"

  FORÇA / FÍSICO:
    arrombar, empurrar, quebrar, levantar, forçar, resistir
    → rollType: "forca"

  CARISMA / SOCIAL:
    convencer, mentir, intimidar, negociar, enganar, persuadir NPC
    → rollType: "carisma"

  ARCANO / MAGIA:
    conjurar, detectar magia, estudar símbolo, rituais, poderes mágicos
    → rollType: "arcano"

  SABEDORIA / INTUIÇÃO:
    desconfiar, perceber mentira, ler emoções, pressentir perigo
    → rollType: "percepcao"

  CURA:
    curar ferimentos, estabilizar aliado
    → rollType: "cura"

DIFICULDADES:
  CD 10 = simples (porta emperrada, ver objeto visível)
  CD 12 = moderado (escalar muro, seguir rastro fresco)
  CD 14 = difícil (detectar armadilha, persuadir neutro)
  CD 16 = perigoso (persuadir hostil, salto arriscado)
  CD 18 = muito arriscado (enganar especialista, ritual complexo)

FORMATO NA NARRAÇÃO — obrigatório ao pedir rolagem:
  Descreva o risco → "Role um d20 de [Tipo]. CD [número]."
  Exemplo: "As tábuas rangem. Um passo errado e vai ouvir você. Role um d20 de Destreza. CD 13."

NÃO RESOLVA SEM DADO:
  ✗ Nunca revele pistas escondidas sem Percepção/Investigação
  ✗ Nunca confirme se NPC mente sem Intuição/Sabedoria
  ✗ Nunca mostre passagem secreta sem Investigação
  ✗ Nunca narre resultado de combate sem Ataque
  ✗ Nunca confirme sucesso de furtividade sem Destreza

REGRA DE OURO: Se você está prestes a revelar informação, narrar consequência de combate
ou confirmar sucesso de ação arriscada — PARE. Peça o dado primeiro.

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
✗ Nunca encerre sem: pergunta direta OU suggestedActions (2-5 opções) OU pedido de rolagem
✗ Nunca invente que o personagem fez algo que o jogador não decidiu
✗ Nunca resolva sozinho um problema que pertence ao jogador
✗ Nunca conduza a história sem escolha do jogador
✗ Nunca use linguagem de chatbot ou assistente virtual
✗ Nunca entregue o mistério completo de uma vez
✗ Nunca revele resultado de ação arriscada sem pedir rolagem antes
✗ suggestedActions SEMPRE inclui "Descrever minha própria ação" como última opção

EXEMPLO IDEAL DE RESPOSTA:
Jogador: "Eu observo a taverna."
IA deve responder:
  narration: "O salão parece calmo demais. O taverneiro evita olhar para a porta dos fundos,
  e três moradores param de conversar quando você menciona os desaparecimentos.
  Há algo escondido — mas notar detalhes sem chamar atenção exige cuidado.
  Role um d20 de Percepção. CD 13."
  requiresRoll: true, rollType: "percepcao", difficultyClass: 13
  suggestedActions: ["Observar o taverneiro de perto", "Examinar a porta dos fundos",
  "Conversar com os moradores", "Pedir uma bebida e aguardar", "Descrever minha própria ação"]

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

// ─── Stall detector ───────────────────────────────────────────────────────────

const STALL_PHRASES = /não sei|o que faço|o que fazer|fico parado|olho ao redor|espero aqui|não faço nada|me perco|estou perdido|não entendo|continuo esperando/i
const VAGUE_ACTIONS = /^(ok|sim|não|continuar?|explorar?|andar?|seguir?|olho|espero|aguardo|fico|vejo|observo\.?|olho\.?)$/i
const GENERIC_OBJECTIVES = /^(investigar|explorar|continuar|avançar|descobrir|procurar)\.?$/i

type StallResult = { stalled: boolean; reason: string }

function detectStall(request: AIMasterRequest): StallResult {
  const msg = request.playerMessage.trim()

  // Direct stall phrase
  if (STALL_PHRASES.test(msg)) {
    return { stalled: true, reason: `jogador expressou desorientação: "${msg.slice(0, 60)}"` }
  }

  // Very short vague action
  if (VAGUE_ACTIONS.test(msg)) {
    return { stalled: true, reason: `ação genérica sem direção: "${msg}"` }
  }

  // Generic objective stuck
  const objective = (request.campaignMemory?.currentObjective ?? '').trim()
  if (objective && GENERIC_OBJECTIVES.test(objective)) {
    return { stalled: true, reason: `objetivo atual é genérico: "${objective}"` }
  }

  // Last 3 player messages are all short (≤ 15 chars) — player spinning
  const recentPlayer = request.recentMessages
    .filter(m => m.role === 'player')
    .slice(-3)
  if (recentPlayer.length >= 3 && recentPlayer.every(m => m.content.trim().length <= 20)) {
    return { stalled: true, reason: 'últimas 3 ações do jogador foram curtas e vagas' }
  }

  // No clues discovered and turn count > 4
  const turnCount = request.campaignMemory?.turnCount ?? 0
  const clues = request.campaignMemory?.discoveredClues ?? []
  if (turnCount > 4 && clues.length === 0) {
    return { stalled: true, reason: `${turnCount} rodadas sem pistas descobertas` }
  }

  return { stalled: false, reason: '' }
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

  // ── Stall detection ──
  const stallSignals = detectStall(request)
  const worldEventDue = (mem?.turnCount ?? 0) > 0 && (mem?.turnCount ?? 0) % 5 === 0

  // ── Instrução de foco dinâmica ──
  let focusInstruction = ''
  if (stallSignals.stalled) {
    focusInstruction = [
      '🚨 ALERTA: MOTOR DE AVANÇO ATIVADO',
      `Sinal detectado: ${stallSignals.reason}`,
      'A campanha travou. Você DEVE agir agora:',
      '1. Introduza UM evento novo (NPC age, barulho, objeto, pista parcial)',
      '2. Ofereça 3-5 caminhos específicos em suggestedActions',
      '3. Atualize currentObjective com algo específico e acionável',
      '4. Nunca repita o estado atual — mude algo no mundo',
    ].join('\n')
  } else if (worldEventDue && (mem?.discoveredClues?.length ?? 0) === 0) {
    focusInstruction = '🌍 EVENTO DE MUNDO: Nenhuma pista descoberta ainda. Introduza um evento inesperado que empurre a narrativa — algo que acontece independente da ação do jogador.'
  } else if (tension >= 8) {
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
${stallSignals.stalled ? '\n⚠️ ATENÇÃO: suggestedActions deve ter 3-5 opções ESPECÍFICAS com verbo+alvo. Não use opções vagas. Atualize currentObjective com algo concreto.' : ''}
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
