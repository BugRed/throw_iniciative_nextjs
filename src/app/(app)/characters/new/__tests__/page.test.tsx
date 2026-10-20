import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock, sessionMock } = vi.hoisted(() => ({
  controllerMock: { controlarDadosWizard: vi.fn() },
  sessionMock: vi.fn(),
}))

vi.mock('@/server/personagens/personagens.controller', () => controllerMock)
vi.mock('@/server/auth/session', () => ({ getSession: sessionMock }))
vi.mock('@/app/(app)/characters/actions', () => ({
  acaoCriarPersonagem: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import NewCharacterPage from '@/app/(app)/characters/new/page'

const DADOS = {
  especies: [{ slug: 'human', name: 'Human' }],
  classes: [
    {
      slug: 'fighter',
      name: 'Fighter',
      hitDie: 10,
      caster: false,
      pericias: { escolher: 2, opcoes: [] },
    },
  ],
  subclasses: [],
  backgrounds: [{ slug: 'soldier', name: 'Soldier' }],
  magiasNivel1: [],
  equipamentos: [],
}

describe('Página de nova ficha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.mockResolvedValue({ user: { id: 'u-1' } })
  })

  it('deve montar o wizard com os dados do SRD buscados no servidor', async () => {
    controllerMock.controlarDadosWizard.mockResolvedValue(DADOS)

    render(await NewCharacterPage())

    expect(controllerMock.controlarDadosWizard).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Nova ficha' })).toBeInTheDocument()
    expect(screen.getByText('Espécie', { selector: 'legend' })).toBeInTheDocument()
  })
})
