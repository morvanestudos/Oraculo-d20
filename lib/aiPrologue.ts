import type { Campaign, Character, CampaignMemory } from './types'
import { createOpenAIClient } from './openai'

const SYSTEM_PROMPT = `Você é um narrador de RPG dark fantasy cinematográfico. Escreve prólogos imersivos de chegada de personagens à cidade de Valdrak e à Taverna dos Corvos.

Regras obrigatórias:
- Escreva de 4 a 7 parágrafos curtos e cinematográficos.
- Tom sombrio, poético e envolvente. Sem humor.
- Nunca use nomes protegidos de marcas (D&D, Forgotten Realms, Wizards, etc).
- Inclua o nome do personagem e, se disponível, sua espécie e classe de forma natural.
- Mencione Valdrak, seus telhados tortos e a chuva fina da noite.
- Mencione desaparecimentos noturnos misteriosos de moradores.
- Mencione rumores de cantos ou sons estranhos vindos da floresta ao norte.
- Explique levemente como o personagem chegou até ali — por destino, acaso ou chamado.
- Não decida ações futuras do jogador. Não controle suas decisões.
- Escreva em português do Brasil.
- O último parágrafo DEVE terminar com exatamente esta pergunta: "O que você faz ao cruzar a porta da taverna?"
- Responda apenas com o texto do prólogo. Sem JSON, sem títulos, sem marcadores.`

function buildFallback(character: Character): string {
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
  if (!openai) return buildFallback(character)

  const raceClass = [character.race, character.className].filter(Boolean).join(', ')
  const charDesc = raceClass ? `${character.name} (${raceClass})` : character.name
  const backstory = character.story?.slice(0, 250)

  const userPrompt = [
    `Campanha: ${campaign.title}`,
    `Personagem: ${charDesc}`,
    backstory ? `Backstory: ${backstory}` : '',
    memory?.currentObjective ? `Objetivo da campanha: ${memory.currentObjective}` : '',
    memory?.currentThreat ? `Ameaça atual: ${memory.currentThreat}` : '',
    '',
    `Escreva o prólogo de chegada de ${character.name} à Taverna dos Corvos em Valdrak.`,
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
    return buildFallback(character)
  }
}
