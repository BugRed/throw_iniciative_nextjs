import { describe, expect, it, vi } from 'vitest'

const { registrarEmailDevMock } = vi.hoisted(() => ({ registrarEmailDevMock: vi.fn() }))

vi.mock('@/server/auth/caixa-de-entrada-dev', () => ({
  registrarEmailDev: (...args: unknown[]) => registrarEmailDevMock(...args),
}))

describe('Configuração do Better Auth', () => {
  describe('quando Discord não está no env', () => {
    it('deve seguir só com e-mail/senha, sem provider social', async () => {
      vi.resetModules()
      vi.stubEnv('DISCORD_CLIENT_ID', '')
      vi.stubEnv('DISCORD_CLIENT_SECRET', '')

      const { auth } = await import('@/server/auth/auth')
      expect(auth.options.socialProviders ?? {}).toEqual({})

      vi.unstubAllEnvs()
    })
  })

  describe('quando Discord está no env', () => {
    it('deve registrar o provider discord', async () => {
      vi.resetModules()
      vi.stubEnv('DISCORD_CLIENT_ID', 'id-teste')
      vi.stubEnv('DISCORD_CLIENT_SECRET', 'segredo-teste')

      const { auth } = await import('@/server/auth/auth')
      expect(auth.options.socialProviders?.discord).toBeDefined()

      vi.unstubAllEnvs()
    })

    it('deve ignorar o provider quando só um dos dois segredos existe', async () => {
      vi.resetModules()
      vi.stubEnv('DISCORD_CLIENT_ID', 'id-teste')
      vi.stubEnv('DISCORD_CLIENT_SECRET', '')

      const { auth } = await import('@/server/auth/auth')
      expect(auth.options.socialProviders ?? {}).toEqual({})

      vi.unstubAllEnvs()
    })
  })

  it('deve exigir verificação de e-mail no login por senha', async () => {
    vi.resetModules()
    const { auth } = await import('@/server/auth/auth')
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true)
  })

  it('deve gerar ids uuid (convenção de PK do repo)', async () => {
    vi.resetModules()
    const { auth } = await import('@/server/auth/auth')
    expect(auth.options.advanced?.database?.generateId).toBeTypeOf('function')
  })
})

describe('Transporte de e-mail de dev', () => {
  it('deve registrar o link de verificação na caixa de entrada', async () => {
    vi.resetModules()
    registrarEmailDevMock.mockResolvedValue(undefined)

    const { auth } = await import('@/server/auth/auth')
    await auth.options.emailVerification?.sendVerificationEmail?.({
      user: {
        id: 'u1',
        name: 'Aria',
        email: 'aria@teste.dev',
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      url: 'https://app.test/api/auth/verify-email?token=abc&callbackURL=%2F',
      token: 'abc',
    })

    expect(registrarEmailDevMock).toHaveBeenCalledWith({
      para: 'aria@teste.dev',
      assunto: 'Verifique seu e-mail',
      url: 'https://app.test/verify-email?token=abc',
    })
  })

  it('deve registrar o link de redefinição de senha na caixa de entrada', async () => {
    vi.resetModules()
    registrarEmailDevMock.mockResolvedValue(undefined)

    const { auth } = await import('@/server/auth/auth')
    await auth.options.emailAndPassword?.sendResetPassword?.({
      user: {
        id: 'u1',
        name: 'Aria',
        email: 'aria@teste.dev',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      url: 'https://app.test/reset?token=xyz',
      token: 'xyz',
    })

    expect(registrarEmailDevMock).toHaveBeenCalledWith({
      para: 'aria@teste.dev',
      assunto: 'Redefinição de senha',
      url: 'https://app.test/reset?token=xyz',
    })
  })
})
