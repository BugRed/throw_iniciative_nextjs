import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireSessionMock } = vi.hoisted(() => ({ requireSessionMock: vi.fn() }))

vi.mock('@/server/auth/session', () => ({
  requireSession: (...args: unknown[]) => requireSessionMock(...args),
}))

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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quando o e-mail está verificado', () => {
    it('deve mostrar nome, e-mail e selo de verificação', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(true))

      render(await DashboardPage())

      expect(screen.getByRole('heading', { name: 'Aria' })).toBeInTheDocument()
      expect(screen.getByText('aria@teste.dev')).toBeInTheDocument()
      expect(screen.getByText('E-mail verificado')).toBeInTheDocument()
    })
  })

  describe('quando o e-mail não está verificado', () => {
    it('deve sinalizar a pendência em vez do selo', async () => {
      requireSessionMock.mockResolvedValue(sessaoCom(false))

      render(await DashboardPage())

      expect(screen.getByText('E-mail não verificado')).toBeInTheDocument()
      expect(screen.queryByText('E-mail verificado')).not.toBeInTheDocument()
    })
  })
})
