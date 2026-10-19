import { describe, expect, it, vi } from 'vitest'

// vi.mock é içado acima dos imports: a referência precisa nascer em vi.hoisted
const { getSessionMock, redirectMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('@/server/auth/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

// redirect do Next interrompe o fluxo lançando; o mock precisa lançar também,
// senão requireSession seguiria e retornaria undefined como se houvesse sessão.
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

const sessao = {
  session: { id: 's1', token: 'tok', userId: 'u1', expiresAt: new Date('2026-10-19T12:00:00Z') },
  user: { id: 'u1', name: 'Aria', email: 'aria@teste.dev', emailVerified: true, image: null },
}

describe('Helpers de sessão', () => {
  describe('quando o Better Auth valida o cookie', () => {
    it('deve devolver a sessão com usuário', async () => {
      vi.resetModules()
      getSessionMock.mockResolvedValue(sessao)

      const { getSession } = await import('@/server/auth/session')
      expect(await getSession()).toEqual(sessao)
    })

    it('deve devolver a sessão em requireSession sem redirecionar', async () => {
      vi.resetModules()
      getSessionMock.mockResolvedValue(sessao)

      const { requireSession } = await import('@/server/auth/session')
      expect(await requireSession()).toEqual(sessao)
      expect(redirectMock).not.toHaveBeenCalled()
    })
  })

  describe('quando não há sessão', () => {
    it('deve devolver null em getSession', async () => {
      vi.resetModules()
      getSessionMock.mockResolvedValue(null)

      const { getSession } = await import('@/server/auth/session')
      expect(await getSession()).toBeNull()
    })

    it('deve redirecionar para /login em requireSession', async () => {
      vi.resetModules()
      getSessionMock.mockResolvedValue(null)
      redirectMock.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT')
      })

      const { requireSession } = await import('@/server/auth/session')
      await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT')
      expect(redirectMock).toHaveBeenCalledWith('/login')
    })
  })
})
