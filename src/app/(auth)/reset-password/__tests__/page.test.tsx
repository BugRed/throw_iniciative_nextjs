import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { paramsMock } = vi.hoisted(() => ({ paramsMock: { get: vi.fn() } }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => paramsMock,
}))

import ResetPasswordPage from '@/app/(auth)/reset-password/page'

describe('Página de redefinição de senha', () => {
  beforeEach(() => {
    paramsMock.get.mockImplementation((chave: string) => (chave === 'token' ? 'tok-1' : null))
  })

  it('deve renderizar o formulário de nova senha', () => {
    render(<ResetPasswordPage />)

    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /redefinir senha/i })).toBeInTheDocument()
  })
})
