import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CharacterSheet } from '@/shared/components/organisms/CharacterSheet'

const FICHA = {
  id: 'p-1',
  name: 'Bree',
  level: 3,
  isNpc: false,
  isVisibleToMaster: true,
  strength: 15,
  dexterity: 14,
  constitution: 12,
  intelligence: 8,
  wisdom: 10,
  charisma: 6,
  hpMax: 25,
  hpCurrent: 18,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
  skillProficiencies: ['athletics', 'intimidation'],
  preparedSpells: ['fire-bolt'],
  equipment: ['chain-mail'],
  feats: [],
  species: { name: 'Human' },
  srdClass: { name: 'Fighter', hitDie: 10 },
}

function secaoStats() {
  return within(screen.getByLabelText('Estatísticas de combate'))
}

function secaoAtributos() {
  return within(screen.getByLabelText('Atributos'))
}

describe('CharacterSheet', () => {
  it('deve abrir com nome e linha espécie · classe · nível', () => {
    render(<CharacterSheet ficha={FICHA} />)

    expect(screen.getByRole('heading', { name: 'Bree' })).toBeInTheDocument()
    expect(screen.getByText('Human · Fighter · Nível 3')).toBeInTheDocument()
  })

  it('deve exibir HP atual/máximo, CA, iniciativa e proficiência', () => {
    render(<CharacterSheet ficha={FICHA} />)
    const stats = secaoStats()

    expect(stats.getByText('18/25')).toBeInTheDocument()
    expect(stats.getByText('12')).toBeInTheDocument()
    expect(stats.getAllByText('+2').length).toBe(2)
  })

  it('deve mostrar iniciativa negativa sem sinal de mais', () => {
    render(<CharacterSheet ficha={{ ...FICHA, initiativeMod: -1 }} />)
    const stats = secaoStats()

    expect(stats.getByText('-1')).toBeInTheDocument()
    expect(stats.queryByText('+(-1)')).not.toBeInTheDocument()
  })

  it('deve derivar o modificador ao lado de cada atributo (15 → +2, 8 → −1)', () => {
    render(<CharacterSheet ficha={FICHA} />)
    const atributos = secaoAtributos()

    expect(atributos.getByText('Força')).toBeInTheDocument()
    expect(atributos.getByText('15')).toBeInTheDocument()
    expect(atributos.getAllByText('+2').length).toBeGreaterThanOrEqual(1)
    expect(atributos.getByText('-1')).toBeInTheDocument()
  })

  it('deve selar a ficha fechada ao mestre e marcar NPC', () => {
    render(<CharacterSheet ficha={{ ...FICHA, isNpc: true, isVisibleToMaster: false }} />)

    expect(screen.getByText('NPC')).toBeInTheDocument()
    expect(screen.getByText('Fechada ao mestre')).toBeInTheDocument()
  })

  it('deve listar perícias, magias e equipamento; campo não-lista vira vazio', () => {
    render(<CharacterSheet ficha={{ ...FICHA, equipment: 'chain-mail' as unknown as string[] }} />)

    expect(screen.getByText('athletics')).toBeInTheDocument()
    expect(screen.getByText('fire-bolt')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })
})
