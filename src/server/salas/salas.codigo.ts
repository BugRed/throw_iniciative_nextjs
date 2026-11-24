import { randomInt } from 'node:crypto'

// Sem 0/O/1/I/L: o código circula em mensagem e em voz alta, e esses pares
// se confundem. 31 símbolos ^ 6 posições ≈ 887 milhões de combinações.
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAMANHO_CODIGO = 6

const FORMATO_CODIGO = new RegExp(`^[${ALFABETO_CODIGO}]{${TAMANHO_CODIGO}}$`)

export function gerarCodigo(): string {
  let codigo = ''
  for (let i = 0; i < TAMANHO_CODIGO; i += 1) {
    codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]
  }
  return codigo
}

// Devolve null para o que não pode ser código: quem chama responde "código
// inválido", sem distinguir formato errado de código inexistente.
export function normalizarCodigo(bruto: string): string | null {
  const codigo = bruto.trim().toUpperCase()
  return FORMATO_CODIGO.test(codigo) ? codigo : null
}
