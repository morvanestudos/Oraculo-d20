import type { Campaign, Character, CampaignMemory } from './types'
import { createOpenAIClient } from './openai'
import { getOfficialCampaign } from './officialCampaigns'

const SYSTEM_PROMPT = `Você é um narrador de RPG dark fantasy cinematográfico. Escreve prólogos imersivos de chegada de personagens ao local inicial da campanha.

Regras obrigatórias:
- Escreva de 4 a 7 parágrafos curtos e cinematográficos.
- Tom sombrio, poético e envolvente. Sem humor.
- Nunca use nomes protegidos de marcas (D&D, Forgotten Realms, Wizards, etc).
- Inclua o nome do personagem e, se disponível, sua espécie e classe de forma natural.
- Use o local inicial, NPCs, ameaça e objetivo da campanha informados pelo usuário.
- Explique levemente como o personagem chegou até ali — por destino, acaso ou chamado.
- Não decida ações futuras do jogador. Não controle suas decisões.
- Escreva em português do Brasil.
- O último parágrafo DEVE terminar com exatamente esta pergunta: "O que você faz ao cruzar a porta da taverna?"
- Responda apenas com o texto do prólogo. Sem JSON, sem títulos, sem marcadores.`

function buildFallback(campaign: Campaign, character: Character): string {
  const officialCampaign = getOfficialCampaign(campaign.title)
  if (officialCampaign?.key === 'aurora') {
    const raceClass = [character.race, character.className].filter(Boolean).join(' ')
    const intro = raceClass
      ? `${character.name} — ${raceClass} —`
      : `${character.name} —`

    return `Aurora se ergue diante de você como uma promessa grande demais para caber nos próprios muros. Torres, mercados, bandeiras de guildas e ruas cheias de ouro, suor e ambição. A Cidade das Mil Oportunidades não dorme. Ela negocia, conspira e devora nomes.

${intro} chegou a Aurora por um caminho que parecia escolha, destino ou dívida. No Distrito dos Aventureiros, cada esquina oferece contrato, perigo e mentira. Mas há algo errado no modo como as pessoas desviam o olhar quando o nome Eldric aparece.

Um mercador desapareceu. O pior não é o sumiço. O pior é que ninguém se lembra dele. Registros falham, retratos mudam, recibos perdem tinta, e famílias falam como se nunca tivessem amado quem foi apagado.

O Grifo Dourado está cheio quando você chega. Canecas batem, moedas tilintam, aventureiros discutem missões. Atrás do balcão, Arvik encontra um papel com uma assinatura quase apagada e empalidece como quem acaba de lembrar de um morto que a cidade inteira esqueceu.

Do lado de fora, Aurora ruge. Dentro da taverna, a palavra Eldric ainda respira por alguns segundos.

O que você faz ao cruzar a porta da taverna?`
  }

  const raceClass = [character.race, character.className].filter(Boolean).join(' ')
  const intro = raceClass
    ? `${character.name} — ${raceClass} —`
    : `${character.name} —`

  return `Antes que seu nome fosse sussurrado na Taverna dos Corvos, você já havia sentido que Valdrak era um lugar diferente dos outros. A chuva que cai sobre seus telhados tortos parece mais densa aqui, como se o próprio céu conspirasse para sufocar qualquer lampejo de esperança que ainda restasse entre essas pedras velhas.

${intro} chegou até Valdrak por caminhos que só você conhece. O que te trouxe até esta vila não importa tanto quanto o que encontrará dentro dela. Aqui, as tochas mal resistem ao vento da noite, e os moradores caminham com os ombros curvados — não pelo frio, mas pelo peso de algo que não conseguem nomear.

Pessoas desaparecem. Não há testemunhos, não há rastros. Apenas cadeiras vazias ao amanhecer e nomes sussurrados com medo nas esquinas molhadas. Os mais velhos dizem que é uma maldição antiga. Os mais jovens ficam em silêncio — porque os mais corajosos entre eles foram os primeiros a sumir.

Da floresta ao norte chegam sons na calada da noite. Cantos, dizem alguns. Lamentos, dizem outros. Ninguém se aventura além das últimas casas depois que a lua desaparece atrás das nuvens. Nem os cachorros latem nessa direção.

A Taverna dos Corvos é o único lugar ainda aquecido nesta noite. A fumaça que escapa pela chaminé carrega o cheiro de madeira úmida e cera queimada. Brós, o taverneiro de olhos cansados, limpa o mesmo copo há uma eternidade — ele já viu aventureiros chegarem com esperança e partir sem ela.

Você está do lado de fora agora. O vento empurra a chuva contra a sua pele. A porta velha range levemente, como se te chamasse.

O que você faz ao cruzar a porta da taverna?`
}

export async function generatePrologue(
  campaign: Campaign,
  character: Character,
  memory?: CampaignMemory | null
): Promise<string> {
  const openai = createOpenAIClient()
  if (!openai) return buildFallback(campaign, character)

  const officialCampaign = getOfficialCampaign(campaign.title)
  const raceClass = [character.race, character.className].filter(Boolean).join(', ')
  const charDesc = raceClass ? `${character.name} (${raceClass})` : character.name
  const backstory = character.story?.slice(0, 250)

  const userPrompt = [
    `Campanha: ${campaign.title}`,
    `Personagem: ${charDesc}`,
    backstory ? `Backstory: ${backstory}` : '',
    memory?.currentObjective ? `Objetivo da campanha: ${memory.currentObjective}` : '',
    memory?.currentThreat ? `Ameaça atual: ${memory.currentThreat}` : '',
    officialCampaign ? `Local inicial oficial: ${officialCampaign.initialMemory.currentLocation}` : '',
    officialCampaign ? `NPCs iniciais: ${officialCampaign.initialNpcs.map(npc => `${npc.name} (${npc.role})`).join(', ')}` : '',
    officialCampaign?.key === 'aurora'
      ? 'Obrigatório: mencione Aurora, o Grifo Dourado, o mercador Eldric, documentos/retratos que mudam e o apagamento de pessoas da memória.'
      : '',
    '',
    officialCampaign?.key === 'aurora'
      ? `Escreva o prólogo de chegada de ${character.name} ao Grifo Dourado em Aurora.`
      : `Escreva o prólogo de chegada de ${character.name} à Taverna dos Corvos em Valdrak.`,
  ].filter(Boolean).join('\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.87,
      max_tokens: 650,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content?.trim()
    if (!text) throw new Error('Resposta vazia')
    return text
  } catch (error) {
    console.error('Falha ao gerar prólogo via OpenAI:', error)
    return buildFallback(campaign, character)
  }
}
