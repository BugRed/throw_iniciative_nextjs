import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

// A página renderiza o formulário client, que depende do router do App Router
// — contexto que não existe no jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}))

describe('Página de login', () => {
  describe('quando o Discord não está no env', () => {
    it('deve renderizar só o caminho por e-mail', async () => {
      vi.resetModules()
      vi.stubEnv('DISCORD_CLIENT_ID', '')
      vi.stubEnv('DISCORD_CLIENT_SECRET', '')

      const LoginPage = (await import('@/app/(auth)/login/page')).default
      render(<LoginPage />)

      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /discord/i })).not.toBeInTheDocument()

      vi.unstubAllEnvs()
    })
  })

  describe('quando o Discord está no env', () => {
    it('deve exibir o botão do Discord', async () => {
      vi.resetModules()
      vi.stubEnv('DISCORD_CLIENT_ID', 'id-teste')
      vi.stubEnv('DISCORD_CLIENT_SECRET', 'segredo-teste')

      const LoginPage = (await import('@/app/(auth)/login/page')).default
      render(<LoginPage />)

      expect(screen.getByRole('button', { name: /entrar com discord/i })).toBeInTheDocument()

      vi.unstubAllEnvs()
    })
  })
})
