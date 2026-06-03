export type ClassAttributes = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type ClassSubclass = {
  id: string
  name: string
  description: string
}

export type AbilityType = 'combat' | 'utility' | 'support' | 'magic'

export type ClassAbility = {
  id: string
  name: string
  description: string
  type: AbilityType
  usesPerScene?: number
}

export type CharacterClassConfig = {
  id: string
  name: string
  description: string
  suggestedRole: string
  primaryAttribute: keyof ClassAttributes
  baseAttributes: ClassAttributes
  startingHp: number
  startingArmorClass: number
  startingInventory: string[]
  startingAbilities: ClassAbility[]
  subclasses?: ClassSubclass[]
}

export const CHARACTER_CLASSES: CharacterClassConfig[] = [
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    description: 'Combatente resistente treinado para proteger aliados e enfrentar inimigos na linha de frente.',
    suggestedRole: 'Tanque / Proteção',
    primaryAttribute: 'strength',
    baseAttributes: { strength: 16, dexterity: 12, constitution: 15, intelligence: 10, wisdom: 11, charisma: 10 },
    startingHp: 14,
    startingArmorClass: 16,
    startingInventory: ['Espada longa', 'Escudo gasto', 'Armadura de couro reforçado', 'Tocha', 'Cantil'],
    startingAbilities: [
      { id: 'proteger-aliado', name: 'Proteger Aliado', description: 'Interpõe-se entre um aliado e um golpe iminente, absorvendo o dano no lugar dele.', type: 'support', usesPerScene: 1 },
      { id: 'golpe-poderoso', name: 'Golpe Poderoso', description: 'Desfere um golpe concentrado que ignora parte da armadura do inimigo e o desequilibra.', type: 'combat', usesPerScene: 2 },
    ],
    subclasses: [
      { id: 'guardiao', name: 'Guardião', description: 'Mestre da defesa — protege aliados com corpo e escudo.' },
      { id: 'duelista', name: 'Duelista', description: 'Combate um-a-um com precisão cirúrgica e provocação.' },
      { id: 'mercenario', name: 'Mercenário', description: 'Soldado experiente que luta por pagamento e sobrevivência.' },
    ],
  },
  {
    id: 'ladino',
    name: 'Ladino',
    description: 'Especialista em furtividade, armadilhas, golpes precisos e investigação.',
    suggestedRole: 'Furtividade / Investigação',
    primaryAttribute: 'dexterity',
    baseAttributes: { strength: 10, dexterity: 16, constitution: 12, intelligence: 13, wisdom: 12, charisma: 11 },
    startingHp: 10,
    startingArmorClass: 14,
    startingInventory: ['Adaga curva', 'Ferramentas de ladrão', 'Capa escura', 'Corda fina', 'Bolsa de moedas falsas'],
    startingAbilities: [
      { id: 'ataque-furtivo', name: 'Ataque Furtivo', description: 'Golpeia um alvo desprevenido nas sombras, causando dano adicional crítico.', type: 'combat', usesPerScene: 2 },
      { id: 'desarmar-armadilha', name: 'Desarmar Armadilha', description: 'Identifica e neutraliza armadilhas com precisão, sem ativá-las acidentalmente.', type: 'utility' },
    ],
    subclasses: [
      { id: 'assassino', name: 'Assassino', description: 'Elimina alvos silenciosamente antes que percebam sua presença.' },
      { id: 'batedor', name: 'Batedor', description: 'Explora terreno inimigo e coleta informações estratégicas.' },
      { id: 'trapaceiro', name: 'Trapaceiro', description: 'Usa engano, disfarce e manipulação para obter vantagem.' },
    ],
  },
  {
    id: 'mago',
    name: 'Mago',
    description: 'Estudioso das artes arcanas, capaz de manipular forças antigas e perigosas.',
    suggestedRole: 'Arcano / Controle',
    primaryAttribute: 'intelligence',
    baseAttributes: { strength: 8, dexterity: 12, constitution: 10, intelligence: 17, wisdom: 13, charisma: 11 },
    startingHp: 8,
    startingArmorClass: 12,
    startingInventory: ['Cajado antigo', 'Grimório gasto', 'Pó arcano', 'Vela ritualística', 'Amuleto quebrado'],
    startingAbilities: [
      { id: 'rajada-arcana', name: 'Rajada Arcana', description: 'Lança um projétil de energia pura que atravessa defesas físicas comuns.', type: 'magic', usesPerScene: 3 },
      { id: 'detectar-magia', name: 'Detectar Magia', description: 'Percebe rastros arcanos, encantamentos ativos ou objetos imbuídos de magia na área.', type: 'utility' },
    ],
    subclasses: [
      { id: 'arcanista', name: 'Arcanista', description: 'Domina as leis fundamentais da magia com precisão absoluta.' },
      { id: 'necromante', name: 'Necromante', description: 'Manipula energia vital e conversa com o limiar da morte.' },
      { id: 'ilusionista', name: 'Ilusionista', description: 'Tece ilusões para confundir, paralisar e enganar inimigos.' },
    ],
  },
  {
    id: 'clerigo',
    name: 'Clérigo',
    description: 'Servo de uma força espiritual, capaz de curar, proteger e enfrentar horrores profanos.',
    suggestedRole: 'Suporte / Divino',
    primaryAttribute: 'wisdom',
    baseAttributes: { strength: 12, dexterity: 10, constitution: 14, intelligence: 11, wisdom: 16, charisma: 13 },
    startingHp: 12,
    startingArmorClass: 15,
    startingInventory: ['Maça de ferro', 'Símbolo sagrado', 'Kit de curandeiro', 'Água consagrada', 'Livro de preces'],
    startingAbilities: [
      { id: 'cura-menor', name: 'Cura Menor', description: 'Canaliza energia divina para restaurar ferimentos leves em si mesmo ou em um aliado próximo.', type: 'support', usesPerScene: 2 },
      { id: 'expulsar-profano', name: 'Expulsar Profano', description: 'Emite uma onda sagrada que repele ou enfraquece entidades profanas e mortos-vivos.', type: 'magic', usesPerScene: 1 },
    ],
    subclasses: [
      { id: 'curandeiro', name: 'Curandeiro', description: 'Especializado em restaurar vida e curar feridas e maldições.' },
      { id: 'exorcista', name: 'Exorcista', description: 'Enfrenta entidades profanas, mortos-vivos e possessões.' },
      { id: 'profeta', name: 'Profeta', description: 'Recebe visões e orientações de forças além da compreensão mortal.' },
    ],
  },
  {
    id: 'patrulheiro',
    name: 'Patrulheiro',
    description: 'Explorador acostumado a florestas, rastros, emboscadas e criaturas selvagens.',
    suggestedRole: 'Explorador / Rastreamento',
    primaryAttribute: 'dexterity',
    baseAttributes: { strength: 12, dexterity: 15, constitution: 13, intelligence: 11, wisdom: 15, charisma: 10 },
    startingHp: 11,
    startingArmorClass: 14,
    startingInventory: ['Arco curto', 'Aljava com flechas', 'Faca de caça', 'Mapa rasgado', 'Ervas medicinais'],
    startingAbilities: [
      { id: 'rastrear-criatura', name: 'Rastrear Criatura', description: 'Lê rastros, cheiros e sinais do ambiente para localizar criaturas ou pessoas na região.', type: 'utility' },
      { id: 'disparo-preciso', name: 'Disparo Preciso', description: 'Mira cuidadosamente em um ponto fraco do alvo para um disparo certeiro e devastador.', type: 'combat', usesPerScene: 2 },
    ],
    subclasses: [
      { id: 'rastreador', name: 'Rastreador', description: 'Segue rastros e lê o ambiente com precisão incomparável.' },
      { id: 'cacador-de-monstros', name: 'Caçador de Monstros', description: 'Especializado em identificar e abater criaturas perigosas.' },
      { id: 'sentinela-da-floresta', name: 'Sentinela da Floresta', description: 'Guardião de florestas e terras selvagens contra invasores.' },
    ],
  },
  {
    id: 'bardo',
    name: 'Bardo',
    description: 'Viajante carismático que usa histórias, música e manipulação social para mudar o destino.',
    suggestedRole: 'Social / Suporte',
    primaryAttribute: 'charisma',
    baseAttributes: { strength: 9, dexterity: 13, constitution: 11, intelligence: 12, wisdom: 10, charisma: 17 },
    startingHp: 9,
    startingArmorClass: 13,
    startingInventory: ['Alaúde antigo', 'Adaga pequena', 'Baralho marcado', 'Caderno de canções', 'Frasco de vinho barato'],
    startingAbilities: [
      { id: 'inspirar-aliado', name: 'Inspirar Aliado', description: 'Entoa palavras ou melodia que eleva o moral de um aliado, concedendo-lhe vantagem na próxima ação.', type: 'support', usesPerScene: 2 },
      { id: 'distrair-inimigo', name: 'Distrair Inimigo', description: 'Usa performance, humor ou provocação para desviar a atenção de um inimigo por um momento crucial.', type: 'utility', usesPerScene: 2 },
    ],
    subclasses: [
      { id: 'menestrel', name: 'Menestrel', description: 'Inspira aliados com música e histórias de glórias passadas.' },
      { id: 'espiao', name: 'Espião', description: 'Usa performance como disfarce para infiltração e coleta de segredos.' },
      { id: 'encantador', name: 'Encantador', description: 'Manipula emoções e convicções com palavras e melodias.' },
    ],
  },
  {
    id: 'bruxo',
    name: 'Bruxo',
    description: 'Portador de um pacto sombrio com uma entidade desconhecida, recebendo poder em troca de algo terrível.',
    suggestedRole: 'Sombrio / Pacto',
    primaryAttribute: 'charisma',
    baseAttributes: { strength: 9, dexterity: 12, constitution: 12, intelligence: 13, wisdom: 11, charisma: 16 },
    startingHp: 9,
    startingArmorClass: 13,
    startingInventory: ['Foco sombrio', 'Contrato queimado', 'Punhal ritualístico', 'Anel frio', 'Página escrita em sangue seco'],
    startingAbilities: [
      { id: 'sussurro-sombrio', name: 'Sussurro Sombrio', description: 'Transmite uma mensagem psíquica perturbadora a um alvo, causando medo ou confusão temporária.', type: 'magic', usesPerScene: 2 },
      { id: 'marca-do-pacto', name: 'Marca do Pacto', description: 'Marca um alvo com o símbolo de seu patrono, revelando sua localização e tornando-o vulnerável.', type: 'magic', usesPerScene: 1 },
    ],
    subclasses: [
      { id: 'pacto-das-sombras', name: 'Pacto das Sombras', description: 'Ligado a entidades que habitam os espaços entre a luz e o escuro.' },
      { id: 'pacto-do-abismo', name: 'Pacto do Abismo', description: 'Serve a uma força primordial de destruição e caos profundo.' },
      { id: 'pacto-da-lua-morta', name: 'Pacto da Lua Morta', description: 'Vinculado a ciclos lunares e à fronteira entre os vivos e os mortos.' },
    ],
  },
  {
    id: 'barbaro',
    name: 'Bárbaro',
    description: 'Guerreiro selvagem movido por fúria, instinto e resistência brutal.',
    suggestedRole: 'Dano / Frontline',
    primaryAttribute: 'strength',
    baseAttributes: { strength: 17, dexterity: 12, constitution: 16, intelligence: 8, wisdom: 11, charisma: 9 },
    startingHp: 16,
    startingArmorClass: 13,
    startingInventory: ['Machado pesado', 'Peles de caça', 'Troféu tribal', 'Cantil de couro', 'Pedra de afiar'],
    startingAbilities: [
      { id: 'furia-selvagem', name: 'Fúria Selvagem', description: 'Entra em estado de fúria que aumenta força e resistência a dor, ignorando penalidades de ferimentos por uma cena.', type: 'combat', usesPerScene: 1 },
      { id: 'intimidacao-brutal', name: 'Intimidação Brutal', description: 'Grita ou exibe força de forma tão aterrorizante que inimigos menores podem recuar ou hesitar.', type: 'utility', usesPerScene: 1 },
    ],
    subclasses: [
      { id: 'berserker', name: 'Berserker', description: 'Entra em fúria incontrolável que aumenta força e ignora dor.' },
      { id: 'totemico', name: 'Totêmico', description: 'Canaliza o espírito de um animal ancestral em combate.' },
      { id: 'quebra-ossos', name: 'Quebra-Ossos', description: 'Especialista em golpes devastadores que quebram defesas inimigas.' },
    ],
  },
]

/** Lookup por id */
export function getClassById(id: string): CharacterClassConfig | undefined {
  return CHARACTER_CLASSES.find(c => c.id === id)
}

/** Lookup por nome (compatibilidade com personagens antigos) */
export function getClassByName(name: string): CharacterClassConfig | undefined {
  return CHARACTER_CLASSES.find(
    c => c.name.toLowerCase() === name.toLowerCase() || c.id === name.toLowerCase()
  )
}

/** Label para o atributo primário */
export const ATTR_LABELS: Record<keyof ClassAttributes, string> = {
  strength:     'Força',
  dexterity:    'Destreza',
  constitution: 'Constituição',
  intelligence: 'Inteligência',
  wisdom:       'Sabedoria',
  charisma:     'Carisma',
}
