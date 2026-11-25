import { describe, expect, it } from 'vitest'

import { TooManyRequestsError } from '@/server/http/errors'
import { LimiteDeAcoes } from '@/server/iniciativa/iniciativa.limite'

describe('LimiteDeAcoes', () => {
  function criar(): { limite: LimiteDeAcoes; avancar: (ms: number) => void } {
    let agora = 1_000
    return { limite: new LimiteDeAcoes(30, 60_000, () => agora), avancar: (ms) => (agora += ms) }
  }

  it('deve aceitar até 30 ações na janela', () => {
    const { limite } = criar()

    expect(() => limite.consumir('u1', 30)).not.toThrow()
  })

  it('deve recusar a 31ª ação com 429', () => {
    const { limite } = criar()
    limite.consumir('u1', 30)

    expect(() => limite.consumir('u1')).toThrow(TooManyRequestsError)
  })

  it('deve contar o lote por NPC e recusá-lo por inteiro sem registrar', () => {
    const { limite } = criar()
    limite.consumir('u1', 20)

    expect(() => limite.consumir('u1', 12)).toThrow(TooManyRequestsError)
    expect(() => limite.consumir('u1', 10)).not.toThrow()
  })

  it('deve liberar de novo depois da janela', () => {
    const { limite, avancar } = criar()
    limite.consumir('u1', 30)
    avancar(60_001)

    expect(() => limite.consumir('u1', 30)).not.toThrow()
  })

  it('deve separar os usuários', () => {
    const { limite } = criar()
    limite.consumir('u1', 30)

    expect(() => limite.consumir('u2')).not.toThrow()
  })
})
