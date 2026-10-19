import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, refreshMock, signOutMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    signOut: (...args: unknown[]) => signOutMock(...args),
  },
}))

import { UserMenu } from '@/shared/components/organisms/UserMenu'

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir o nome e o e-mail como dica', () => {
    render(<UserMenu nome="Aria" email="aria@teste.dev" />)

    expect(screen.getByText('Aria')).toHaveAttribute('title', 'aria@teste.dev')
  })

  describe('quando o usuário sai', () => {
    it('deve encerrar a sessão e voltar para a home', async () => {
      signOutMock.mockResolvedValue({})
      const user = userEvent.setup()

      render(<UserMenu nome="Aria" email="aria@teste.dev" />)
      await user.click(screen.getByRole('button', { name: 'Sair' }))

      expect(signOutMock).toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith('/')
      expect(refreshMock).toHaveBeenCalled()
    })
  })
})
