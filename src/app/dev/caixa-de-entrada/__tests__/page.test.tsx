import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listarEmailsDevMock, notFoundMock } = vi.hoisted(() => ({
  listarEmailsDevMock: vi.fn(),
  notFoundMock: vi.fn(),
}))

vi.mock('@/server/auth/caixa-de-entrada-dev', () => ({
  listarEmailsDev: (...args: unknown[]) => listarEmailsDevMock(...args),
}))

// notFound do Next interrompe o render lançando; o mock espelha o contrato.
vi.mock('next/navigation', () => ({
  notFound: (...args: unknown[]) => notFoundMock(...args),
}))

import CaixaDeEntradaPage from '@/app/dev/caixa-de-entrada/page'

describe('Caixa de entrada de dev', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarEmailsDevMock.mockReturnValue([])
  })

  describe('fora de produção', () => {
    it('deve orientar o que fazer quando não há e-mails', () => {
      render(<CaixaDeEntradaPage />)

      expect(screen.getByText(/Nenhum e-mail ainda/i)).toBeInTheDocument()
    })

    it('deve listar cada e-mail com destinatário, assunto e link', () => {
      listarEmailsDevMock.mockReturnValue([
        {
          para: 'aria@teste.dev',
          assunto: 'Verifique seu e-mail',
          url: 'http://localhost:3000/api/auth/verify-email?token=abc',
          criadoEm: new Date('2026-10-19T12:00:00Z'),
        },
      ])

      render(<CaixaDeEntradaPage />)

      expect(screen.getByText(/aria@teste\.dev/)).toBeInTheDocument()
      expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Abrir link' })).toHaveAttribute(
        'href',
        'http://localhost:3000/api/auth/verify-email?token=abc',
      )
    })
  })

  describe('em produção', () => {
    it('deve responder 404 sem expor a caixa', () => {
      notFoundMock.mockImplementation(() => {
        throw new Error('NEXT_NOT_FOUND')
      })
      vi.stubEnv('NODE_ENV', 'production')

      expect(() => render(<CaixaDeEntradaPage />)).toThrow('NEXT_NOT_FOUND')
      expect(listarEmailsDevMock).not.toHaveBeenCalled()

      vi.unstubAllEnvs()
    })
  })
})
