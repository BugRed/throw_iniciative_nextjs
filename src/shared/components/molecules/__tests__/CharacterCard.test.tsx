import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CharacterCard } from '@/shared/components/molecules/CharacterCard'

const PERSONAGEM = {
  id: 'p-1',
  name: 'Bree',
  level: 3,
  isNpc: false,
  isVisibleToMaster: true,
  hpMax: 25,
  armorClass: 12,
  initiativeMod: 2,
  species: { name: 'Human' },
  srdClass: { name: 'Fighter' },
}

describe('CharacterCard', () => {
  it('deve linkar para a ficha e resumir espécie, classe e nível', () => {
    render(<CharacterCard personagem={PERSONAGEM} />)

    expect(screen.getByRole('link', { name: /Bree/ })).toHaveAttribute('href', '/characters/p-1')
    expect(screen.getByText('Human · Fighter · Nível 3')).toBeInTheDocument()
  })

  it('deve exibir HP, CA e iniciativa com sinal', () => {
    render(<CharacterCard personagem={PERSONAGEM} />)

    expect(screen.getByText('HP 25')).toBeInTheDocument()
    expect(screen.getByText('CA 12')).toBeInTheDocument()
    expect(screen.getByText('INIT +2')).toBeInTheDocument()
  })

  it('deve mostrar iniciativa negativa sem sinal de mais', () => {
    render(<CharacterCard personagem={{ ...PERSONAGEM, initiativeMod: -1 }} />)

    expect(screen.getByText('INIT -1')).toBeInTheDocument()
  })

  it('deve carregar badges de NPC e de ficha fechada', () => {
    render(<CharacterCard personagem={{ ...PERSONAGEM, isNpc: true, isVisibleToMaster: false }} />)

    expect(screen.getByText('NPC')).toBeInTheDocument()
    expect(screen.getByText('Fechada')).toBeInTheDocument()
  })
})
