import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock } = vi.hoisted(() => ({ controllerMock: { controlarAssinatura: vi.fn() } }))

vi.mock('@/server/salas/salas.controller', () => controllerMock)

import { GET } from '@/app/api/rooms/[id]/events/route'
import { AppError } from '@/server/http/errors'

const SALA = '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e02'

function chamar() {
  const req = new Request(`http://localhost/api/rooms/${SALA}/events`)
  return GET(req, { params: Promise.resolve({ id: SALA }) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/rooms/[id]/events', () => {
  it('deve responder um text/event-stream sem cache e sem buffer de proxy', async () => {
    controllerMock.controlarAssinatura.mockResolvedValue(new ReadableStream())

    const res = await chamar()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8')
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(res.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('deve delegar o id da rota e o sinal de aborto da requisição', async () => {
    controllerMock.controlarAssinatura.mockResolvedValue(new ReadableStream())

    await chamar()

    expect(controllerMock.controlarAssinatura).toHaveBeenCalledWith(SALA, expect.any(AbortSignal))
  })

  it('deve traduzir erro de domínio em JSON com o status dele, sem abrir stream', async () => {
    controllerMock.controlarAssinatura.mockRejectedValue(
      new AppError('Sessão necessária.', 401, 'SEM_SESSAO'),
    )

    const res = await chamar()

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ codigo: 'SEM_SESSAO' })
  })
})
