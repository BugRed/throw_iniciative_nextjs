import { afterEach, describe, expect, it, vi } from 'vitest'

import { EventBus } from '@/server/realtime/event-bus'
import { criarFluxoSse, formatarEvento } from '@/server/realtime/sse'

const decodificador = new TextDecoder()

async function ler(leitor: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const { value } = await leitor.read()
  return decodificador.decode(value)
}

function abrir(ativo = true, controle = new AbortController()) {
  const bus = new EventBus()
  const fluxo = criarFluxoSse({ bus, roomId: 'r-1', userId: 'ana', ativo, signal: controle.signal })
  return { bus, controle, leitor: fluxo.getReader() }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('formatarEvento', () => {
  it('deve emitir só o id da sala no payload, nunca dado da sala', () => {
    expect(formatarEvento({ tipo: 'npc:added', roomId: 'r-1', alvo: 'u-9' })).toBe(
      'event: npc:added\ndata: {"roomId":"r-1"}\n\n',
    )
  })
})

describe('criarFluxoSse', () => {
  it('deve confirmar a conexão e depois repassar os eventos da sala', async () => {
    const { bus, leitor } = abrir()

    expect(await ler(leitor)).toBe(': conectado\n\n')
    bus.publicar({ tipo: 'member:joined', roomId: 'r-1' })

    expect(await ler(leitor)).toBe('event: member:joined\ndata: {"roomId":"r-1"}\n\n')
  })

  it('deve mandar batida de coração a cada 25 s para a conexão não cair', async () => {
    vi.useFakeTimers()
    const { leitor } = abrir()
    await ler(leitor)

    await vi.advanceTimersByTimeAsync(25_000)

    expect(await ler(leitor)).toBe(': ping\n\n')
  })

  it('deve encerrar o stream e liberar timer quando o cliente aborta', async () => {
    vi.useFakeTimers()
    const { controle, leitor } = abrir()
    await ler(leitor)

    controle.abort()

    expect((await leitor.read()).done).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('deve já nascer encerrado se o cliente abortou antes de conectar', async () => {
    vi.useFakeTimers()
    const controle = new AbortController()
    controle.abort()

    const { leitor } = abrir(true, controle)

    expect((await leitor.read()).done).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('criarFluxoSse: encerramento', () => {
  it('deve liberar timer e assinatura quando o leitor cancela, sem lançar', async () => {
    vi.useFakeTimers()
    const { bus, leitor } = abrir()
    await ler(leitor)

    await leitor.cancel()

    expect(vi.getTimerCount()).toBe(0)
    expect(() => bus.publicar({ tipo: 'npc:added', roomId: 'r-1' })).not.toThrow()
  })

  it('deve fechar o stream quando o bus desconecta o usuário (saída ou expulsão)', async () => {
    const { bus, leitor } = abrir()
    await ler(leitor)

    bus.desconectar('r-1', 'ana')

    expect((await leitor.read()).done).toBe(true)
  })

  it('deve entregar a quem está pendente só o evento endereçado a ele', async () => {
    const { bus, leitor } = abrir(false)
    await ler(leitor)

    bus.publicar({ tipo: 'npc:added', roomId: 'r-1' })
    bus.publicar({ tipo: 'member:joined', roomId: 'r-1', alvo: 'ana' })

    expect(await ler(leitor)).toContain('event: member:joined')
  })
})
