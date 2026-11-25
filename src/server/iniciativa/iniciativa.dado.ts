import type { RollMode } from '@prisma/client'

// Dado autoritativo (docs/negocio/iniciativa.md). O cliente nunca envia resultado.

const FAIXA_UINT32 = 2 ** 32

// Fonte de aleatoriedade injetável: produção usa o CSPRNG do runtime, teste
// injeta sequência fixa.
export type FonteAleatoria = () => number

export const fonteSegura: FonteAleatoria = () => crypto.getRandomValues(new Uint32Array(1))[0]

// Rejection sampling: `valor % lados` favoreceria os primeiros resultados quando
// 2^32 não é múltiplo de `lados`. Descartar a cauda que sobra deixa a faixa
// aceita com tamanho múltiplo exato.
export function rollDie(lados: number, fonte: FonteAleatoria = fonteSegura): number {
  if (!Number.isInteger(lados) || lados < 2 || lados > FAIXA_UINT32) {
    throw new RangeError('O dado precisa de um número inteiro de lados maior que 1.')
  }
  const limite = FAIXA_UINT32 - (FAIXA_UINT32 % lados)
  let valor = fonte()
  while (valor >= limite) valor = fonte()
  return (valor % lados) + 1
}

export type RolagemD20 = {
  // O d20 que valeu.
  resultado: number
  // O outro d20 de vantagem/desvantagem; null no modo normal.
  descartado: number | null
}

export function rolarD20(modo: RollMode, fonte: FonteAleatoria = fonteSegura): RolagemD20 {
  const primeiro = rollDie(20, fonte)
  if (modo === 'normal') return { resultado: primeiro, descartado: null }
  const segundo = rollDie(20, fonte)
  const [maior, menor] = primeiro >= segundo ? [primeiro, segundo] : [segundo, primeiro]
  return modo === 'advantage'
    ? { resultado: maior, descartado: menor }
    : { resultado: menor, descartado: maior }
}
