import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock, sessionMock } = vi.hoisted(() => ({
  controllerMock: { controlarBusca: vi.fn() },
  sessionMock: vi.fn(),
}))

vi.mock('@/server/personagens/personagens.controller', () => controllerMock)
vi.mock('@/server/auth/session', () => ({ getSession: sessionMock }))
vi.mock('@/app/(app)/characters/actions', () => ({
  acaoEditarPersonagem: vi.fn(),
  acaoAlternarVisibilidade: vi.fn(),
}))

import CharacterSheetPage from '@/app/(app)/characters/[id]/page'

const FICHA = {
  id: 'p-1',
  ownerUserId: 'u-1',
  name: 'Bree',
  level: 3,
  isNpc: false,
  isVisibleToMaster: true,
  strength: 15,
  dexterity: 14,
  constitution: 12,
  intelligence: 8,
  wisdom: 10,
  charisma: 8,
  hpMax: 25,
  hpCurrent: 18,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
  skillProficiencies: ['athletics'],
  preparedSpells: [],
  equipment: ['chain-mail'],
  feats: [],
  species: { name: 'Human' },
  srdClass: { name: 'Fighter', hitDie: 10 },
  subclass: null,
  background: { name: 'Soldier' },
}

const PARAMS = Promise.resolve({ id: 'p-1' })

describe('Ficha de personagem por id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir a ficha completa com ações de edição para o dono', async () => {
    sessionMock.mockResolvedValue({ user: { id: 'u-1' } })
    controllerMock.controlarBusca.mockResolvedValue(FICHA)

    render(await CharacterSheetPage({ params: PARAMS }))

    expect(controllerMock.controlarBusca).toHaveBeenCalledWith('p-1')
    expect(screen.getByRole('heading', { name: 'Bree' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar ficha ao mestre' })).toBeInTheDocument()
  })

  it('deve esconder as ações de edição de quem não é o dono', async () => {
    sessionMock.mockResolvedValue({ user: { id: 'u-2' } })
    controllerMock.controlarBusca.mockResolvedValue(FICHA)

    render(await CharacterSheetPage({ params: PARAMS }))

    expect(screen.getByRole('heading', { name: 'Bree' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })
})
