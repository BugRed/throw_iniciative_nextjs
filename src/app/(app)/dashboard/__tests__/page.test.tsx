import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireSessionMock, controllerMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  controllerMock: { controlarListagem: vi.fn() },
}))

vi.mock('@/server/auth/session', () => ({
  requireSession: (...args: unknown[]) => requireSessionMock(...args),
}))
vi.mock('@/server/personagens/personagens.controller', () => controllerMock)

import DashboardPage from '@/app/(app)/dashboard/page'

function sessaoCom(emailVerified: boolean) {
  return {
    session: { id: 's1', token: 'tok', userId: 'u1', expiresAt: new Date() },
    user: {
      id: 'u1',
      name: 'Aria',
      email: 'aria@teste.dev',
      emailVerified,
      image: null,
    },
  }
}

const FICHA = {
  id: 'p-1',
  name: 'Bree',
  level: 3,
  isNpc: false,
  isVisibleToMaster: true,
  hpMax: 25,
  hpCurrent: 18,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
  species: { name: 'Human' },
  srdClass: { name: 'Fighter' },
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quando o e-mail está verificado', () => {
    it('deve mostrar nome, e-mail e selo de verificação', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(true))
      controllerMock.controlarListagem.mockResolvedValue([FICHA])

      render(await DashboardPage())

      expect(screen.getByRole('heading', { name: 'Aria' })).toBeInTheDocument()
      expect(screen.getByText('aria@teste.dev')).toBeInTheDocument()
      expect(screen.getByText('E-mail verificado')).toBeInTheDocument()
    })
  })

  describe('quando o e-mail não está verificado', () => {
    it('deve sinalizar a pendência em vez do selo', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(false))
      controllerMock.controlarListagem.mockResolvedValue([])

      render(await DashboardPage())

      expect(screen.getByText('E-mail não verificado')).toBeInTheDocument()
      expect(screen.queryByText('E-mail verificado')).not.toBeInTheDocument()
    })
  })

  describe('Suas fichas', () => {
    it('deve listar as fichas do usuário com contagem e link para a ficha', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(true))
      controllerMock.controlarListagem.mockResolvedValue([FICHA])

      render(await DashboardPage())

      expect(screen.getByRole('heading', { name: /Suas fichas/ })).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Bree/ })).toHaveAttribute('href', '/characters/p-1')
      expect(screen.getByRole('link', { name: 'Nova ficha' })).toHaveAttribute(
        'href',
        '/characters/new',
      )
    })

    it('deve convidar à primeira ficha quando a lista está vazia', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(true))
      controllerMock.controlarListagem.mockResolvedValue([])

      render(await DashboardPage())

      expect(screen.getByText(/Nenhuma ficha ainda/u)).toBeInTheDocument()
    })
  })
})
