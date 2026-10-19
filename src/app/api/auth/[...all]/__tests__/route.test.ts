import { describe, expect, it, vi } from 'vitest'

const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }))

vi.mock('@/server/auth/auth', () => ({
  auth: {
    handler: (...args: unknown[]) => handlerMock(...args),
  },
}))

// A rota é fronteira HTTP pura: tradução própria de HTTP aqui seria duplicar o
// handler do Better Auth. O contrato a proteger é só a delegação.
import { GET, POST } from '@/app/api/auth/[...all]/route'

describe('Rota catch-all de auth', () => {
  it('deve delegar GET ao handler do Better Auth com a request intacta', async () => {
    const respostaEsperada = new Response('ok')
    handlerMock.mockResolvedValue(respostaEsperada)
    const request = new Request('http://localhost:3000/api/auth/get-session')

    const resposta = (await GET(request)) as Response

    expect(handlerMock).toHaveBeenCalledWith(request)
    expect(resposta).toBe(respostaEsperada)
  })

  it('deve delegar POST ao mesmo handler', async () => {
    handlerMock.mockResolvedValue(new Response('ok'))
    const request = new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
    })

    await POST(request)

    expect(handlerMock).toHaveBeenCalledWith(request)
  })
})
