import { describe, expect, it } from 'vitest'

import {
  classeDeArmadura,
  hpMaximo,
  modificadorDeAtributo,
  modificadorDeIniciativa,
  proficienciaPorNivel,
} from '@/server/personagens/calculos'

// Fórmulas especificadas em docs/negocio/personagens-calculos.md.

describe('modificadorDeAtributo', () => {
  it('deve retornar 0 no 10 e 11 (piso, não arredondamento)', () => {
    expect(modificadorDeAtributo(10)).toBe(0)
    expect(modificadorDeAtributo(11)).toBe(0)
  })

  it('deve arredondar para baixo em pontuações ímpares', () => {
    expect(modificadorDeAtributo(13)).toBe(1)
    expect(modificadorDeAtributo(9)).toBe(-1)
    expect(modificadorDeAtributo(15)).toBe(2)
  })

  it('deve derivar modificadores extremos de pontuações fora do point buy', () => {
    expect(modificadorDeAtributo(20)).toBe(5)
    expect(modificadorDeAtributo(1)).toBe(-5)
  })
})

describe('proficienciaPorNivel', () => {
  it('deve valer 2 nos níveis 1 a 4', () => {
    expect(proficienciaPorNivel(1)).toBe(2)
    expect(proficienciaPorNivel(4)).toBe(2)
  })

  it('deve subir 1 a cada 4 níveis até 6 no nível 17', () => {
    expect(proficienciaPorNivel(5)).toBe(3)
    expect(proficienciaPorNivel(8)).toBe(3)
    expect(proficienciaPorNivel(9)).toBe(4)
    expect(proficienciaPorNivel(12)).toBe(4)
    expect(proficienciaPorNivel(13)).toBe(5)
    expect(proficienciaPorNivel(16)).toBe(5)
    expect(proficienciaPorNivel(17)).toBe(6)
    expect(proficienciaPorNivel(20)).toBe(6)
  })

  it('deve tratar nível inválido como 1 em vez de devolver menos que 2', () => {
    expect(proficienciaPorNivel(0)).toBe(2)
    expect(proficienciaPorNivel(-3)).toBe(2)
  })
})

describe('hpMaximo', () => {
  it('deve calcular o nível 1 como hit_die + mod(CON) — Fighter CON 12 → 11', () => {
    expect(hpMaximo(10, 12, 1)).toBe(11)
  })

  it('deve aplicar mod(CON) negativo — Wizard d6 CON 8 → 5', () => {
    expect(hpMaximo(6, 8, 1)).toBe(5)
  })

  it('deve somar a média do dado + mod(CON) por nível acima de 1', () => {
    // d10 CON 12: 11 no nível 1, +7 por nível (5 + 1 + 1).
    expect(hpMaximo(10, 12, 2)).toBe(18)
    expect(hpMaximo(10, 12, 3)).toBe(25)
    // d8 CON 15 (mod +2): 10 no nível 1, +7 por nível (4 + 1 + 2).
    expect(hpMaximo(8, 15, 3)).toBe(24)
  })

  it('deve tratar nível inválido como 1', () => {
    expect(hpMaximo(10, 12, 0)).toBe(11)
  })
})

describe('classeDeArmadura', () => {
  it('deve partir de 10 e somar apenas mod(DEX) (sem armadura no MVP)', () => {
    expect(classeDeArmadura(10)).toBe(10)
    expect(classeDeArmadura(14)).toBe(12)
    expect(classeDeArmadura(8)).toBe(9)
    expect(classeDeArmadura(15)).toBe(12)
    expect(classeDeArmadura(20)).toBe(15)
  })
})

describe('modificadorDeIniciativa', () => {
  it('deve valer mod(DEX) sem a feat Alert, em qualquer nível', () => {
    expect(modificadorDeIniciativa(14, false, 1)).toBe(2)
    expect(modificadorDeIniciativa(14, false, 20)).toBe(2)
    expect(modificadorDeIniciativa(8, false, 1)).toBe(-1)
  })

  it('deve somar o bônus de proficiência com Alert (SRD 5.2, não o +5 de 2014)', () => {
    expect(modificadorDeIniciativa(14, true, 1)).toBe(4)
    expect(modificadorDeIniciativa(14, true, 5)).toBe(5)
    expect(modificadorDeIniciativa(14, true, 17)).toBe(8)
  })
})
