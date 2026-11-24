import { describe, expect, it } from 'vitest'

import {
  ALFABETO_CODIGO,
  gerarCodigo,
  normalizarCodigo,
  TAMANHO_CODIGO,
} from '@/server/salas/salas.codigo'

describe('gerarCodigo', () => {
  it('deve gerar 6 caracteres só do alfabeto sem 0, O, 1, I e L', () => {
    const codigos = Array.from({ length: 500 }, () => gerarCodigo())

    for (const codigo of codigos) {
      expect(codigo).toHaveLength(TAMANHO_CODIGO)
      expect([...codigo].every((c) => ALFABETO_CODIGO.includes(c))).toBe(true)
    }
    expect(ALFABETO_CODIGO).toHaveLength(31)
    expect(ALFABETO_CODIGO).not.toMatch(/[0O1IL]/)
  })
})

describe('normalizarCodigo', () => {
  it('deve aceitar minúsculas e espaços ao redor', () => {
    expect(normalizarCodigo('  ab2cd3 ')).toBe('AB2CD3')
  })

  it.each([
    ['vazio', ''],
    ['curto', 'AB2CD'],
    ['longo', 'AB2CD34'],
    ['com caractere ambíguo', 'AB0CD3'],
    ['com símbolo', 'AB-CD3'],
  ])('deve devolver null para código %s', (_nome, entrada) => {
    expect(normalizarCodigo(entrada)).toBeNull()
  })
})
