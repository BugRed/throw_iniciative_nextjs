import { describe, expect, it } from 'vitest'

import { rolarD20, rollDie } from '@/server/iniciativa/iniciativa.dado'

function sequencia(...valores: number[]): () => number {
  let i = 0
  return () => valores[i++]
}

describe('rollDie', () => {
  describe('quando a fonte devolve valores dentro da faixa', () => {
    it('deve mapear 0 para 1 e o último valor aceito para o último lado', () => {
      expect(rollDie(20, sequencia(0))).toBe(1)
      expect(rollDie(20, sequencia(19))).toBe(20)
    })
  })

  describe('quando o valor cai na cauda que causaria viés de módulo', () => {
    it('deve descartar e sortear de novo', () => {
      // 2^32 % 20 = 16: valores >= 2^32 - 16 são rejeitados.
      const fonte = sequencia(2 ** 32 - 1, 2 ** 32 - 16, 4)

      expect(rollDie(20, fonte)).toBe(5)
    })

    it('deve aceitar o último valor da faixa múltipla exata', () => {
      expect(rollDie(20, sequencia(2 ** 32 - 17))).toBe(((2 ** 32 - 17) % 20) + 1)
    })
  })

  describe('quando o número de lados é inválido', () => {
    it.each([0, 1, -3, 2.5, Number.NaN])('deve rejeitar %s', (lados) => {
      expect(() => rollDie(lados)).toThrow(RangeError)
    })
  })

  it('deve ficar sempre entre 1 e o número de lados com a fonte real', () => {
    const resultados = Array.from({ length: 500 }, () => rollDie(20))

    expect(Math.min(...resultados)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...resultados)).toBeLessThanOrEqual(20)
  })
})

describe('rolarD20', () => {
  it('deve rolar um dado só no modo normal', () => {
    expect(rolarD20('normal', sequencia(6))).toEqual({ resultado: 7, descartado: null })
  })

  it('deve ficar com o maior e descartar o menor na vantagem', () => {
    expect(rolarD20('advantage', sequencia(3, 15))).toEqual({ resultado: 16, descartado: 4 })
  })

  it('deve ficar com o menor e descartar o maior na desvantagem', () => {
    expect(rolarD20('disadvantage', sequencia(3, 15))).toEqual({ resultado: 4, descartado: 16 })
  })

  it('deve manter o valor quando os dois dados empatam', () => {
    expect(rolarD20('advantage', sequencia(9, 9))).toEqual({ resultado: 10, descartado: 10 })
  })
})
