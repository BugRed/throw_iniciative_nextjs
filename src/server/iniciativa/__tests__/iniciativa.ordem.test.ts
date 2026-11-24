import { describe, expect, it } from 'vitest'

import { ordenarIniciativa, type Ordenavel } from '@/server/iniciativa/iniciativa.ordem'

function p(id: string, total: number, mod = 0, tiebreakRolls: number[] = []): Ordenavel {
  return { id, rollResult: total, initiativeMod: mod, tiebreakRolls }
}

const ids = (lista: Ordenavel[]): string[] => lista.map((x) => x.id)

describe('ordenarIniciativa', () => {
  describe('quando os totais são diferentes', () => {
    it('deve ordenar do maior para o menor', () => {
      const r = ordenarIniciativa([p('a', 10), p('b', 18), p('c', 14)])

      expect(ids(r.ordem)).toEqual(['b', 'c', 'a'])
      expect(r.pendentesDesempate).toEqual([])
    })
  })

  describe('quando o total empata', () => {
    it('deve desempatar pelo maior modificador', () => {
      const r = ordenarIniciativa([p('a', 15, 1), p('b', 15, 4)])

      expect(ids(r.ordem)).toEqual(['b', 'a'])
      expect(r.pendentesDesempate).toEqual([])
    })

    it('deve pedir re-rolagem de quem segue empatado no modificador', () => {
      const r = ordenarIniciativa([p('a', 15, 2), p('b', 15, 2), p('c', 20, 0)])

      expect(ids(r.ordem)).toEqual(['c', 'a', 'b'])
      expect(r.pendentesDesempate).toEqual(['a', 'b'])
    })

    it('deve ordenar pela re-rolagem quando todos os empatados rolaram', () => {
      const r = ordenarIniciativa([p('a', 15, 2, [7]), p('b', 15, 2, [16])])

      expect(ids(r.ordem)).toEqual(['b', 'a'])
      expect(r.pendentesDesempate).toEqual([])
    })

    it('deve pedir só a rolagem de quem ainda não rolou a rodada', () => {
      const r = ordenarIniciativa([p('a', 15, 2, [7]), p('b', 15, 2)])

      expect(r.pendentesDesempate).toEqual(['b'])
    })
  })

  describe('quando a re-rolagem empata de novo', () => {
    it('deve repetir só entre os que seguem empatados', () => {
      const r = ordenarIniciativa([p('a', 15, 2, [10]), p('b', 15, 2, [10]), p('c', 15, 2, [3])])

      expect(ids(r.ordem)).toEqual(['a', 'b', 'c'])
      expect(r.pendentesDesempate).toEqual(['a', 'b'])
    })

    it('deve resolver na segunda rodada', () => {
      const r = ordenarIniciativa([p('a', 15, 2, [10, 4]), p('b', 15, 2, [10, 18])])

      expect(ids(r.ordem)).toEqual(['b', 'a'])
      expect(r.pendentesDesempate).toEqual([])
    })
  })
})

describe('ordenarIniciativa — bordas', () => {
  it('deve devolver vazio para lista vazia e o mesmo item para lista de um', () => {
    expect(ordenarIniciativa([]).ordem).toEqual([])
    expect(ids(ordenarIniciativa([p('a', 5)]).ordem)).toEqual(['a'])
  })

  it('não deve alterar a lista recebida', () => {
    const entrada = [p('a', 1), p('b', 9)]

    ordenarIniciativa(entrada)

    expect(ids(entrada)).toEqual(['a', 'b'])
  })
})
