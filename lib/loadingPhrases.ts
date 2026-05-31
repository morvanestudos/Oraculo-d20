export const LOADING_PHRASES = [
  'O Mestre consulta os pergaminhos antigos...',
  'Ecos de aventuras passadas ressoam pelos corredores...',
  'Os ventos de Valdrak trazem novos presságios...',
  'A chama da taverna ilumina caminhos esquecidos...',
  'Criaturas observam das sombras da floresta...',
  'Os bardos estão reunindo histórias...',
  'O Mestre Arcano prepara os pergaminhos...',
  'Os cartógrafos desenham os caminhos...',
  'Novos rumores surgem nas tavernas...',
  'As estrelas revelam o destino dos aventureiros...',
  'Algo observa da floresta de Valdrak...',
  'Novas lendas estão prestes a nascer...',
  'Os dados do destino começam a rolar...',
  'O Oráculo desperta mais uma vez...',
]

export function getRandomLoadingPhrase(): string {
  return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]
}
