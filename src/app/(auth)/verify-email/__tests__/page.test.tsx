import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { paramsMock, verifyEmailMock } = vi.hoisted(() => ({
  paramsMock: { get: vi.fn() },
  verifyEmailMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => paramsMock,
}))

// Sem este mock o painel dispara verifyEmail de verdade no mount — e o jsdom
// faria fetch num servidor real, quebrando o isolamento do teste.
vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
  },
}))

import VerifyEmailPage from '@/app/(auth)/verify-email/page'

describe('Página de verificação de e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // O painel encadeia .then() no retorno — o mock precisa devolver promise
    // mesmo nos testes que só olham o estado inicial.
    verifyEmailMock.mockResolvedValue({ error: null })
    paramsMock.get.mockImplementation((chave: string) => (chave === 'token' ? 'tok-1' : null))
  })

  it('deve renderizar o painel de verificação sem quebrar o Suspense', () => {
    render(<VerifyEmailPage />)

    expect(screen.getByText(/verificando/i)).toBeInTheDocument()
  })
})
