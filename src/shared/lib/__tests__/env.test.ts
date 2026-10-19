import { describe, expect, it, vi } from 'vitest'

describe('Validação de ambiente no boot', () => {
  it('falha quando DATABASE_URL não está definida', async () => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', '')
    await expect(import('@/shared/lib/env')).rejects.toThrow(/DATABASE_URL/)
    vi.unstubAllEnvs()
  })

  it('rejeita DATABASE_URL que não é URL', async () => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', 'postgres-sem-protocolo')
    await expect(import('@/shared/lib/env')).rejects.toThrow()
    vi.unstubAllEnvs()
  })

  it('aceita a URL do banco de dev do docker-compose', async () => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/app_dev?schema=public')
    const modulo = await import('@/shared/lib/env')
    expect(modulo.env.DATABASE_URL).toContain('app_dev')
    expect(modulo.env.S3_BUCKET).toBe('app-bucket')
    vi.unstubAllEnvs()
  })
})
