import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TIPOS_EVENTO_SALA } from '@/shared/lib/eventos-sala'
import { useRoomEvents } from '@/shared/lib/use-room-events'

// EventSource falso: guarda os ouvintes para a gente "receber" eventos.
class FakeEventSource {
  static instancias: FakeEventSource[] = []
  onopen: (() => void) | null = null
  ouvintes = new Map<string, () => void>()
  fechada = false
  constructor(readonly url: string) {
    FakeEventSource.instancias.push(this)
  }
  addEventListener(tipo: string, ouvinte: () => void) {
    this.ouvintes.set(tipo, ouvinte)
  }
  close() {
    this.fechada = true
  }
}

beforeEach(() => {
  FakeEventSource.instancias = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useRoomEvents', () => {
  it('deve abrir o stream da sala e escutar todos os tipos de evento', () => {
    renderHook(() => useRoomEvents('r-1', vi.fn()))

    const [fonte] = FakeEventSource.instancias
    expect(fonte.url).toBe('/api/rooms/r-1/events')
    expect([...fonte.ouvintes.keys()]).toEqual([...TIPOS_EVENTO_SALA])
  })

  it('deve chamar o callback com o tipo do evento recebido', () => {
    const aoMudar = vi.fn()
    renderHook(() => useRoomEvents('r-1', aoMudar))

    FakeEventSource.instancias[0].ouvintes.get('npc:added')?.()

    expect(aoMudar).toHaveBeenCalledWith('npc:added')
  })

  it('deve avisar "reconectado" só a partir da segunda abertura, para refazer a leitura', () => {
    const aoMudar = vi.fn()
    renderHook(() => useRoomEvents('r-1', aoMudar))
    const fonte = FakeEventSource.instancias[0]

    fonte.onopen?.()
    expect(aoMudar).not.toHaveBeenCalled()
    fonte.onopen?.()

    expect(aoMudar).toHaveBeenCalledWith('reconectado')
  })

  it('não deve reabrir a conexão quando só o callback muda entre renders', () => {
    const { rerender } = renderHook(({ cb }) => useRoomEvents('r-1', cb), {
      initialProps: { cb: vi.fn() },
    })

    rerender({ cb: vi.fn() })

    expect(FakeEventSource.instancias).toHaveLength(1)
  })
})

describe('useRoomEvents: ciclo de vida', () => {
  it('deve usar o callback mais recente ao receber o evento', () => {
    const antigo = vi.fn()
    const novo = vi.fn()
    const { rerender } = renderHook(({ cb }) => useRoomEvents('r-1', cb), {
      initialProps: { cb: antigo },
    })
    rerender({ cb: novo })

    FakeEventSource.instancias[0].ouvintes.get('member:joined')?.()

    expect(novo).toHaveBeenCalledWith('member:joined')
    expect(antigo).not.toHaveBeenCalled()
  })

  it('deve fechar a conexão ao desmontar e trocar de stream ao mudar de sala', () => {
    const { rerender, unmount } = renderHook(({ id }) => useRoomEvents(id, vi.fn()), {
      initialProps: { id: 'r-1' },
    })

    rerender({ id: 'r-2' })
    expect(FakeEventSource.instancias[0].fechada).toBe(true)
    expect(FakeEventSource.instancias[1].url).toBe('/api/rooms/r-2/events')

    unmount()
    expect(FakeEventSource.instancias[1].fechada).toBe(true)
  })
})
