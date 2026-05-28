export const campaigns = [
  {
    id: 'black-moor',
    title: 'Sombras sobre o Pântano',
    theme: 'Horror/Exploração',
    level: 1,
    maxPlayers: 5,
    description: 'Uma região pantanosa onde segredos antigos despertam.',
    players: [
      { id: 'p1', name: 'Lina', characterName: 'Thia', level: 2 },
      { id: 'p2', name: 'Rafael', characterName: 'Borin', level: 1 }
    ]
  },
  {
    id: 'ruins-sun',
    title: 'Ruínas do Sol',
    theme: 'Dungeon/Cidade',
    level: 3,
    maxPlayers: 6,
    description: 'Exploração de ruínas e intriga política.',
    players: []
  }
]

export const sampleCharacter = {
  id: 'c1',
  name: 'Thia Luzengarda',
  race: 'Humano',
  className: 'Guerreiro',
  level: 2,
  attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
  hp: 28,
  ac: 16,
  inventory: ['Espada longa', 'Cota de malha', 'Poção de cura'],
  story: 'Uma lutadora veterana que busca redenção no interior do pântano.'
}
