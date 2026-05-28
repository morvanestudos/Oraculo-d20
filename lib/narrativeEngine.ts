import type { ActiveNPC, CampaignMemory, SceneState } from './types'

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function randomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, items.length))
}

export function sceneStateFromMemory(memory: CampaignMemory): SceneState {
  return {
    campaignId: memory.campaignId,
    currentScene: memory.currentScene,
    currentLocation: memory.currentLocation,
    currentObjective: memory.currentObjective,
    currentThreat: memory.currentThreat,
    tensionLevel: memory.tensionLevel,
    discoveredClues: memory.discoveredClues,
    activeNPCs: memory.activeNPCs,
    activeEnemies: memory.activeEnemies,
    storyFlags: memory.storyFlags,
    turnCount: memory.turnCount,
    lastPlayerAction: memory.lastPlayerAction,
    lastMasterAction: memory.lastMasterAction,
    environmentDetails: [randomItem(explorationNarrative)],
    updatedAt: memory.updatedAt
  }
}

function buildNPCHint(npcs: ActiveNPC[]): string {
  if (npcs.length === 0) return ''
  const names = npcs.map(npc => npc.name).slice(0, 2).join(' e ')
  return `Você ainda lembra de ${names}, que ${npcs[0]?.role} e parece ${npcs[0]?.mood}. `
}

function buildMemoryHint(memory: CampaignMemory | null): string {
  if (!memory) return ''
  const parts: string[] = []
  if (memory.currentLocation) {
    parts.push(`A cena permanece em ${memory.currentLocation}`)
  }
  if (memory.currentObjective) {
    parts.push(`o objetivo atual é ${memory.currentObjective}`)
  }
  if (memory.currentThreat) {
    parts.push(`a ameaça principal é ${memory.currentThreat}`)
  }
  if (memory.discoveredClues.length > 0) {
    parts.push(`você já notou ${memory.discoveredClues.length} pistas: ${memory.discoveredClues.slice(-2).join(', ')}`)
  }
  if (memory.activeNPCs.length > 0) {
    parts.push(`personagens conhecidos incluem ${memory.activeNPCs.map(npc => npc.name).slice(0, 2).join(', ')}`)
  }
  return parts.length > 0 ? `${parts.join('. ')}.` : ''
}

export function buildMemorySummary(state: SceneState, memory: CampaignMemory | null): string {
  const npcNames = memory?.activeNPCs.map(npc => npc.name).join(', ') || 'nenhum'
  const clues = state.discoveredClues.length > 0 ? state.discoveredClues.join(', ') : 'nenhuma'
  return `Resumo rápido: você está em ${state.currentLocation}, com objetivo de ${state.currentObjective}. A maior ameaça é ${state.currentThreat}. Pistas importantes: ${clues}. NPCs conhecidos: ${npcNames}.` 
}

// Exploração calma e detalhes ambientais
const explorationNarrative = [
  'As tochas projetam sombras dançantes pelas paredes úmidas.',
  'Um silêncio pesado domina o ar, quebrado apenas pelo som de seus passos.',
  'A temperatura cai levemente conforme você avança.',
  'Teias de aranha pendem dos cantos, antigas e negligenciadas.',
  'O cheiro de mofo e pedra antiga impregna o local.',
  'Seus olhos se ajustam lentamente à penumbra.',
  'Gotas de água ecoam no vazio, marcando o tempo.',
  'A textura das paredes é áspera e irregular sob seus dedos.',
  'O ar é denso, como se sussurrasse segredos antigos.',
  'Marcas de unhas ou garras profundas rasgam a superfície.',
  'A luz flutua entre as rachaduras, projetando padrões estranhos.',
  'Um pó fino cobre tudo, deixando trilhas a cada movimento.',
  'O silêncio é interrompido apenas pelo bater acelerado do seu coração.',
  'Linhas de ouro ou prata brilham fracamente na escuridão.',
  'O ar carrega o cheiro de sangue seco ou poder arcano.',
  'Pegadas—algumas recentes, outras desgastadas—marcam o chão.',
  'Você sente uma corrente de ar frio vindo de algum lugar desconhecido.',
  'As sombras parecem mover-se independentemente das tochas.',
  'Símbolos esculpidos revestem as paredes, quase invisíveis.',
  'Um zumbido baixo e constante ecoa pelas câmaras.',
]

const cluesNarrative = [
  'Você avista uma marca de arranhadura fresca na pedra.',
  'Há pegadas recentes no pó do chão.',
  'Um objeto pequeno brilha entre os escombros.',
  'Símbolos esculpidos aparecem na parede, quase ocultos.',
  'A trilha de algo—ou alguém—passa por aqui.',
  'Uma mensagem ou aviso foi deixado propositalmente.',
  'Evidências de uma batalha anterior marcam o local.',
  'Um segredo aguarda sob a superfície das coisas.',
  'Algo foi movido ou removido recentemente.',
  'Você detecta o cheiro de mágica antiga ou recém-conjurada.',
  'Uma corrente ou corrente partida jaz no chão.',
  'Manchas de um líquido desconhecido marcam o caminho.',
  'Um diário ou pergaminho parcialmente queimado está aqui.',
  'Jóias ou moedas espalhadas sugerem apressado abandono.',
  'Uma ferramenta de escavação deixada para trás.',
  'Marcas de queimadura e escuridão nas paredes.',
  'Um mapa ou diagrama fragmentado nos destroços.',
  'Ossos ou restos de algo—ou alguém—ficaram para trás.',
  'Um talismã ou amuleto estranho repousa sozinho.',
  'Marcas de escrita antiga em um material desconhecido.',
]

const tensionNarrative = [
  'Um som distante ecoa na escuridão—talvez passos.',
  'A sensação de ser observado cresce.',
  'As sombras parecem se mover levemente.',
  'Uma brisa fria toca sua nuca.',
  'O silêncio é quebrado por um ruído metálico.',
  'Algo se mexe nas profundidades do local.',
  'A nervura da ameaça cresce a cada passo.',
  'Você não está sozinho aqui.',
  'Um grito distante—ou apenas o vento?—ecoa pelas paredes.',
  'A temperatura cai dramaticamente em poucos segundos.',
  'Você sente uma pressão nos ouvidos, como se algo grande se aproximasse.',
  'Um sussurro indistinto vem de um corredor adjacente.',
  'As luzes piscam, deixando você brevemente na escuridão total.',
  'Você ouve o som de correntes arrastando lentamente.',
  'Uma aura vermelha ou azul aparece brevemente no escuro.',
  'O cheiro de enxofre ou sangue fica mais intenso.',
  'As paredes parecem se aproximar imperceptivelmente.',
  'Um rangido profundo vem do teto ou do chão.',
  'Você avista algo se mover na periferia da sua visão.',
  'Uma maldição antiga parece despertar-se ao seu redor.',
]

const dangerNarrative = [
  'Uma criatura surge das sombras, olhando fixamente para você.',
  'O chão desmorona sob seus pés—era uma armadilha.',
  'Uma magia antiga se desperta, iluminando a câmara com luz assustadora.',
  'Inimigos bloqueiam seu caminho de retirada.',
  'Uma parede se move, fechando a passagem atrás de você.',
  'O ataque ocorre sem aviso, rápido e violento.',
  'Um espírito ou guardião manifesta-se, furioso.',
  'A aventura entra em fase crítica.',
  'Flechas disparam de furos ocultos na parede.',
  'O chão abaixo colapsa, revelando um abismo profundo.',
  'Você é envolvido por uma rede mágica ou física.',
  'A sala se enche com fumaça tóxica ou gás venenoso.',
  'Uma criatura alada emerge do teto em um redemoinho de vento.',
  'O portão de ferro bate com força, aprisionando você.',
  'Múltiplas sombras ganham forma e se aproximam.',
  'Uma voz antiga ordena sua destruição em uma língua esquecida.',
  'O chão se torna lama pegajosa, puxando você para baixo.',
  'Uma lâmina de energia corta o ar, quase acertando você.',
  'O inimigo revela sua verdadeira forma, muito mais assustador.',
  'Você se vê cercado e sem rota de fuga clara.',
]

const mysterySolutionNarrative = [
  'A resposta estava bem à vista o tempo todo.',
  'Os fragmentos do mistério se encaixam de repente.',
  'Você compreende o padrão escondido.',
  'A verdade emerge das sombras.',
  'Tudo faz sentido agora—você vê a conexão.',
  'O segredo finalmente se revela.',
  'A ilusão se desfaz, mostrando o que é real.',
  'Você encontrou a chave para tudo isso.',
  'A maldição perde seu poder conforme você compreende sua natureza.',
  'O mapa se torna claro em sua mente.',
  'Você decifra a língua antiga e compreende a mensagem.',
  'A verdadeira intenção do construtor se torna aparente.',
  'O ritual quebrado finalmente revela seu propósito original.',
  'Você vê através da ilusão de magia que obscurecia a verdade.',
  'O nome verdadeiro da criatura revela seu ponto fraco.',
  'A contradição se resolve de forma surpreendente.',
  'Você compreende o sacrifício feito há séculos atrás.',
  'A hierarquia oculta entre seus inimigos se torna clara.',
  'Você finalmente compreende por que é você que deve estar aqui.',
  'A profecia faz sentido ao interpretar-a diferentemente.',
]

const successConsequence = [
  'Sua ação abre novas possibilidades.',
  'O caminho adiante fica mais claro.',
  'Você progride mais profundamente na aventura.',
  'Um novo segredo se desbloqueia.',
  'A tensão diminui—por enquanto.',
  'Você ganha vantagem sobre a situação.',
  'O destino sorri para você neste momento.',
  'Você descobre algo que mudará tudo.',
  'Uma porta antiga se abre, revelando novos mistérios.',
  'O inimigo recua, respeitando sua força.',
  'Você encontra um aliado inesperado na sombra.',
  'A recompensa superou suas expectativas.',
  'Você sente o poder fluir através de você.',
  'A harmonia retorna ao local por um breve momento.',
  'Você obtém informação crucial para sua jornada.',
  'A magia antiga responde ao seu comando.',
  'O caminho proibido agora está aberto.',
  'Uma marca de bênção aparece em seu corpo.',
  'Você compreende um fragmento da verdade cósmica.',
  'A próxima ação será muito mais fácil agora.',
]

const failureConsequence = [
  'A situação piora de forma inesperada.',
  'Você precisa se adaptar rapidamente.',
  'A ameaça cresce mais forte.',
  'Uma oportunidade se perde.',
  'As coisas se tornam mais complicadas agora.',
  'Você enfrenta uma nova dificuldade.',
  'O tempo está se esgotando.',
  'Você recebe um ferimento ou maldição menor.',
  'O inimigo agora conhece sua tática.',
  'Uma parede de escape desmorona.',
  'Você alerta o que estava dormindo neste lugar.',
  'Mais inimigos aparecem em resposta ao seu fracasso.',
  'O custo de sua ação é maior do que esperado.',
  'Você perde um item valioso ou memória.',
  'A maldição aqui se fortalece em sua presença.',
  'Um portal para outro lugar se abre perigosamente.',
  'Você atrai a atenção de algo muito maior.',
  'A estrutura se torna instável ao seu redor.',
  'Uma aliança quebra por falta de confiança.',
  'Você sente a magia voltada contra você.',
]

const npcReactions = [
  'um guardião ou porteiro antigo',
  'um espírito irado',
  'um viajante perdido',
  'um comerciante misterioso',
  'um sobrevivente escondido',
  'um avatar de uma divindade esquecida',
  'um ser que guarda segredos',
  'um sacerdote de um culto antigo',
  'um golem ou construto mágico',
  'um escravo libertado há séculos',
  'um trickster que ama enigmas',
  'um mago aposentado',
  'uma criatura humanóide estranha',
  'um cavaleiro sem cabeça',
  'um espelho vivente que fala verdades',
]

const possibleObjectives = [
  'descobrir a origem da ruína',
  'encontrar um artefato perdido',
  'destruir uma maldição',
  'escapar com vida',
  'proteger algo valioso',
  'revelar a verdade oculta',
  'derrotar uma ameaça iminente',
  'desativar um feitiço antigo',
  'resgatar um aliado perdido',
  'restaurar um poder que foi roubado',
]

const environmentProgression = [
  ['iluminado por tochas fracas', 'escuro demais para ver claramente'],
  ['ar fresco', 'ar pesado e abafado'],
  ['silêncio total', 'sons distantes ecoam'],
  ['simples e vazio', 'repleto de detalhes estranhos'],
  ['estável e seguro', 'instável e perigoso'],
]

// Narrativas específicas para diferentes tipos de ações
const combatNarrative = [
  'O ar se corta com tensão enquanto você levanta sua arma.',
  'Você se posiciona com precisão mortal.',
  'O inimigo se prepara para responder seu ataque.',
  'A distância entre você se fecha perigosamente.',
  'Você enxerga a abertura perfeita para atacar.',
  'O mundo ao seu redor desaparece—apenas o combate importa agora.',
  'Seu reflexo aguça-se, pronto para a ação.',
  'A lâmina cintila enquanto você se move com letal graça.',
  'Cada músculo do seu corpo está tenso e preparado.',
  'Você grita e se move para o ataque final.',
  'A criatura se posiciona para bloqueá-lo.',
  'O solo ao seu redor já está manchado de sangue.',
  'Você sente o peso de sua arma como extensão natural de seu braço.',
  'O inimigo não vê vindo o que virá a seguir.',
  'Você aproveita a hesitação do seu oponente.',
  'A batalha chegou a seu pico crítico.',
  'Você sente a morte pairando sobre ambos.',
  'O combate é uma dança de morte e sobrevivência.',
  'Você não pode vacilar agora—a vitória está próxima.',
  'O inimigo transpira medo conforme você avança.',
]

const investigationNarrative = [
  'Seus sentidos aguçam enquanto você examina cada detalhe.',
  'A verdade whispers hidden beneath the surface, waiting to be found.',
  'Você move-se lentamente, deixando nada passar.',
  'Cada pequeno detalhe pode mudar tudo.',
  'Você sente que a resposta está próxima.',
  'A lógica dos eventos começa a se revelar.',
  'Você rastreia os passos deixados para trás.',
  'As peças do quebra-cabeça começam a se alinhar.',
  'Sua intuição grita que há algo aqui.',
  'Você limpa o pó e a história surge.',
  'A verdade estava escondida, aguardando que alguém procurasse.',
  'Você segue a trilha invisível com precisão.',
  'Cada descoberta leva a questionamentos mais profundos.',
  'Você sente como um investigador em solo sagrado.',
  'A câmara revela seus segredos lentamente.',
  'Você está no caminho certo—você pode sentir.',
  'A investigação aprofunda-se em mistério genuíno.',
  'Você descobre camadas de engano sobre engano.',
  'A verdade é maior do que você imaginava.',
  'Cada pista levanta dez novas perguntas.',
]

const magicNarrative = [
  'O ar vibra com poder arcano.',
  'Você canaliza a magia antiga, sua fonte destilada.',
  'Runas brilham sob seus dedos enquanto você conjura.',
  'A realidade torce-se sob seu comando.',
  'Você sente a magia fluindo através de suas veias.',
  'O mundo responde ao seu incantamento.',
  'Você sussurra palavras de poder que fazem ecoar através das eras.',
  'A magia antiga reconhece você como digno.',
  'Você se torna conduto de forças cósmicas.',
  'Arcos de energia dançam ao seu redor.',
  'O feitiço toma forma como realidade tangível.',
  'Você sente a aprovação da própria magia.',
  'O ritual antigo pulsa com propósito renovado.',
  'Você desafia as leis da natureza e elas cedem.',
  'A magia o engloba em um abraço familiar.',
  'Você comanda elementos como se fossem seus escravos.',
  'O poder flui através de você sem resistência.',
  'A magia não resiste—ela o reconhece.',
  'Você é um com as arcanas forças do universo.',
  'O feitiço sai de você como se sempre esperasse.',
]

const charismeticsNarrative = [
  'Suas palavras ecoam com autoridade.',
  'O ar ao redor de você parece mudar.',
  'Você fala com confiança que não pode ser negada.',
  'Seus olhos capturam a atenção de todos ao seu redor.',
  'A presença de sua personalidade enche a sala.',
  'Você comanda respeito com apenas sua presença.',
  'Suas palavras penetram corações e mentes.',
  'A criatura vacila sob o peso de sua vontade.',
  'Você irradia confiança que é contagiosa.',
  'Sua proposta ressoa como verdade absoluta.',
  'A persuasão flui de você como respiração.',
  'Você vê através do disfarce emocional deles.',
  'Suas ações falam louder than words ever could.',
  'Você é inegavelmente magnético neste momento.',
  'A criatura não pode resistir ao seu apelo.',
  'Você consegue o que deseja com graça absoluta.',
  'A intriga em seus olhos os hipnotiza.',
  'Você toca algo profundo em sua psique.',
  'Suas palavras reescrevem a realidade deles.',
  'Você é irresistível, inegável, inevitável.',
]

export type NarrativeResult = {
  narration: string
  consequence?: string
  clue?: string
  testRequired?: {
    type: string
    difficulty: number
    reason: string
  }
  environmentUpdate?: string
  next?: string
}

export function initializeSceneState(campaignId: string, sceneName: string): SceneState {
  return {
    campaignId,
    currentScene: sceneName,
    currentLocation: 'a entrada de uma ruína antiga',
    currentObjective: randomItem(possibleObjectives),
    currentThreat: 'desconhecido',
    tensionLevel: 1,
    discoveredClues: [],
    activeNPCs: [],
    activeEnemies: [],
    storyFlags: {},
    turnCount: 0,
    lastPlayerAction: '',
    lastMasterAction: '',
    environmentDetails: [randomItem(explorationNarrative)],
    updatedAt: new Date().toISOString()
  }
}

export function progressSceneState(state: SceneState, playerAction: string, actionType: string | null): SceneState {
  const newState = { ...state }
  const normalized = playerAction.toLowerCase()
  newState.turnCount += 1
  newState.lastPlayerAction = playerAction

  // Evolução de cena baseada em turnos
  if (newState.turnCount <= 2) {
    newState.currentScene = 'exploração'
  } else if (newState.turnCount <= 5) {
    newState.currentScene = 'descoberta'
  } else if (newState.turnCount <= 8) {
    newState.currentScene = 'tensão'
  } else if (newState.turnCount <= 10) {
    newState.currentScene = 'perigo'
  } else {
    newState.currentScene = 'confronto'
  }

  // Atualiza local com progressão simples
  if (newState.turnCount === 3 && !newState.storyFlags['movedLocation']) {
    newState.currentLocation = 'um corredor enegrecido' 
    newState.storyFlags['movedLocation'] = true
  }
  if (newState.turnCount === 6 && !newState.storyFlags['reachedChamber']) {
    newState.currentLocation = 'a câmara antiga'
    newState.storyFlags['reachedChamber'] = true
  }
  if (newState.turnCount === 9 && !newState.storyFlags['enteredSanctum']) {
    newState.currentLocation = 'o santuário proibido'
    newState.storyFlags['enteredSanctum'] = true
  }

  // Evolução de objetivo e ameaça
  if (!newState.storyFlags['objectiveRefined'] && newState.turnCount === 4) {
    newState.currentObjective = randomItem(possibleObjectives)
    newState.storyFlags['objectiveRefined'] = true
  }

  if (newState.tensionLevel < 3) {
    newState.currentThreat = 'um mistério desconhecido'
  } else if (newState.tensionLevel < 6) {
    newState.currentThreat = 'um ambiente suspeito e atento'
  } else if (newState.tensionLevel < 9) {
    newState.currentThreat = 'uma presença hostil na escuridão'
  } else {
    newState.currentThreat = 'um confronto iminente com algo monstruoso'
  }

  // Aumentar tensão com o passar dos turnos e ações arriscadas
  if (newState.turnCount % 3 === 0) {
    newState.tensionLevel = Math.min(10, newState.tensionLevel + 1)
  }
  if (actionType === 'ataque' && newState.tensionLevel < 6) {
    newState.tensionLevel = 6
  }
  if ((actionType === 'destreza' || actionType === 'percepcao') && newState.tensionLevel < 3) {
    newState.tensionLevel = 3
  }
  if (/armadilha|contra|ataque|inimigo|monstro/.test(normalized)) {
    newState.tensionLevel = Math.min(10, newState.tensionLevel + 1)
    newState.storyFlags['recentDanger'] = true
  }

  // Pistas descobertas persistentes
  if ((actionType === 'investigacao' || actionType === 'percepcao') && !newState.storyFlags['foundClue']) {
    const clue = randomItem(cluesNarrative)
    if (!newState.discoveredClues.includes(clue)) {
      newState.discoveredClues = [...newState.discoveredClues, clue]
    }
    newState.storyFlags['foundClue'] = true
  }

  if (/símbolo|símbolos|símbolo/.test(normalized) && !newState.storyFlags['foundSymbol']) {
    const clue = 'um símbolo antigo desenhado na pedra úmida'
    newState.discoveredClues = [...newState.discoveredClues, clue]
    newState.storyFlags['foundSymbol'] = true
  }
  if (/passagem secreta|passagem secreta|portão oculto|porta escondida|segredo/.test(normalized) && !newState.storyFlags['foundSecretPassage']) {
    const clue = 'uma passagem secreta escondida atrás de entulho'
    newState.discoveredClues = [...newState.discoveredClues, clue]
    newState.storyFlags['foundSecretPassage'] = true
    newState.currentObjective = 'investigar a passagem secreta'
  }

  // NPCs persistentes simples
  if ((actionType === 'carisma' || actionType === 'arcano' || /falar com|conversar com|perguntar para|interrogar/.test(normalized)) && newState.activeNPCs.length < 3) {
    const npcName = randomItem(npcReactions).replace(/^um |uma /, '').replace(/ *$/, '')
    const npc: ActiveNPC = {
      name: npcName,
      role: 'aliado potencial',
      mood: 'impaciente',
      knownInfo: 'sabe algo sobre passagens e armadilhas'
    }
    if (!newState.activeNPCs.some(n => n.name === npc.name)) {
      newState.activeNPCs = [...newState.activeNPCs, npc]
      newState.storyFlags['metNPC'] = true
    }
  }

  if (actionType === 'ataque') {
    newState.storyFlags['recentCombat'] = true
  }

  if (actionType === 'carisma' || actionType === 'arcano') {
    newState.storyFlags['importantDecision'] = true
  }

  // Atualizações de ambiente
  if (newState.tensionLevel >= 5 && !newState.storyFlags['ambientThreateningSet']) {
    newState.environmentDetails = [randomItem(tensionNarrative)]
    newState.storyFlags['ambientThreateningSet'] = true
  }

  newState.updatedAt = new Date().toISOString()
  return newState
}

export function narrateAction(state: SceneState, playerAction: string, actionType: string | null, memory: CampaignMemory | null = null): NarrativeResult {
  let narration = ''
  let testRequired: NarrativeResult['testRequired'] | undefined
  let environmentUpdate: string | undefined
  let clue: string | undefined
  let consequence: string | undefined

  const memoryHint = memory ? buildMemoryHint(memory) : ''
  const npcHint = memory && memory.activeNPCs.length > 0 ? `Você ainda tem em mente ${memory.activeNPCs.map(n => n.name).slice(-2).join(' e ')}.` : ''
  const recentClueHint = memory && memory.discoveredClues.length > 0 ? ` As marcas que você encontrou antes continuam presentes: ${memory.discoveredClues.slice(-1)[0]}.` : ''

  if (actionType === 'investigacao' || actionType === 'percepcao') {
    narration = `${memoryHint} ${randomItem(investigationNarrative)}`.trim()
    if (memory && memory.discoveredClues.length > 0) {
      narration += ` ${recentClueHint}`
    }

    if (!state.storyFlags['firstClueAppears']) {
      clue = randomItem(cluesNarrative)
      narration += ` ${clue}`
    }

    if (memory && memory.activeNPCs.length > 0) {
      narration += ` ${npcHint}`
    }

    testRequired = {
      type: 'investigação',
      difficulty: state.tensionLevel + 11,
      reason: 'examinar os detalhes cuidadosamente'
    }
  } else if (actionType === 'ataque') {
    narration = `${memoryHint} ${randomItem(combatNarrative)}`.trim()
    if (state.tensionLevel >= 3) {
      narration += ` ${randomItem(dangerNarrative)}`
    }
    if (memory && memory.storyFlags?.recentCombat) {
      narration += ' O último confronto ainda ecoa em sua memória.'
    }

    testRequired = {
      type: 'ataque',
      difficulty: state.tensionLevel + 12,
      reason: 'fazer o ataque contar'
    }
    consequence = randomItem(successConsequence)
  } else if (actionType === 'arcano') {
    narration = `${memoryHint} ${randomItem(magicNarrative)}`.trim()
    if (memory && memory.activeNPCs.length > 0) {
      narration += ` ${randomItem(mysterySolutionNarrative)}`
    }
    testRequired = {
      type: 'arcano',
      difficulty: state.tensionLevel + 11,
      reason: 'canalizar a magia'
    }
  } else if (actionType === 'carisma') {
    narration = `${memoryHint} ${randomItem(charismeticsNarrative)}`.trim()
    if (memory && memory.activeNPCs.length > 0) {
      narration += ` ${randomItem(mysterySolutionNarrative)}`
    } else {
      narration += ` ${randomItem(explorationNarrative)}`
    }
    testRequired = {
      type: 'carisma',
      difficulty: state.tensionLevel + 11,
      reason: 'persuadir ou intimidar'
    }
  } else if (actionType === 'destreza' || actionType === 'forca') {
    narration = `${memoryHint} ${randomItem(explorationNarrative)}`.trim()
    if (state.tensionLevel > 5) {
      narration = `${memoryHint} ${randomItem(dangerNarrative)}`.trim()
    }
    testRequired = {
      type: actionType === 'destreza' ? 'destreza' : 'força',
      difficulty: state.tensionLevel + 10,
      reason: actionType === 'destreza' ? 'escapar ou esquivar' : 'superar obstáculo'
    }
  } else if (actionType === 'cura') {
    narration = `${memoryHint} ${randomItem(explorationNarrative)} ${randomItem(successConsequence)}`.trim()
    testRequired = {
      type: 'cura',
      difficulty: state.tensionLevel + 10,
      reason: 'restaurar vidas'
    }
  } else if (actionType === 'join') {
    narration = `${memoryHint} Você entra na campanha e se encontra em ${state.currentLocation}. ${randomItem(explorationNarrative)}`.trim()
  } else {
    narration = `${memoryHint} ${randomItem(explorationNarrative)}`.trim()
    if (state.tensionLevel > 5) {
      narration += ` ${randomItem(tensionNarrative)}`
    }
  }

  let next = ''
  if (state.tensionLevel >= 9) {
    next = 'Agora a dinâmica muda: o confronto está próximo e o perigo cresce a cada passo.'
  } else if (state.tensionLevel >= 6) {
    next = 'É provável que algo hostil esteja à espreita a qualquer momento.'
  } else if (state.tensionLevel >= 3) {
    next = 'O lugar parece mais suspeito do que antes.'
  } else {
    next = 'Há mais a descobrir neste local silencioso.'
  }

  return {
    narration,
    consequence,
    clue,
    testRequired,
    environmentUpdate,
    next
  }
}

export function buildMasterMessage(narrative: NarrativeResult): string {
  let message = narrative.narration

  if (narrative.testRequired) {
    message += `\n\nRole um d20 de ${narrative.testRequired.type}. CD ${narrative.testRequired.difficulty}.`
  }

  if (narrative.next) {
    message += ` ${narrative.next}`
  }

  return message.trim()
}
