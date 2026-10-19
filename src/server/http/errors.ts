import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

import { errosNaoTratadosTotal } from '@/shared/lib/metrics'

// Erros de domínio com status HTTP embutido. Os serviços/controllers lançam estes;
// o route handler converte para resposta via `toErrorResponse` (ou envolve o corpo
// com `handleRoute`). Assim a camada HTTP não precisa de try/catch espalhado.
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo: string,
    readonly detalhes?: unknown,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', detalhes?: unknown) {
    super(message, 422, 'VALIDACAO', detalhes)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 404, 'NAO_ENCONTRADO')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito com um registro existente.', detalhes?: unknown) {
    super(message, 409, 'CONFLITO', detalhes)
  }
}

// Mapa dos códigos de erro do Prisma que viram resposta específica. Crescer o
// tratamento = adicionar uma linha aqui, não um novo `if`.
const PRISMA_ERROS: Record<string, { status: number; codigo: string; erro: string }> = {
  P2002: { status: 409, codigo: 'CONFLITO', erro: 'Já existe um registro com esse valor único.' },
  P2025: { status: 404, codigo: 'NAO_ENCONTRADO', erro: 'Registro não encontrado.' },
}

// Converte qualquer erro em uma resposta JSON padronizada `{ erro, codigo, detalhes? }`.
// Cada `if` é uma CATEGORIA de erro (não um caso): erro de domínio (AppError e suas
// subclasses), erro do Prisma, e o fallback. Novos casos de domínio entram como
// subclasses de AppError — sem tocar nesta função.
//
// Adotou `zod` para validar entrada nos `*.schema.ts`? Adicione, no topo, o ramo:
//
//   if (err instanceof ZodError) {
//     return NextResponse.json(
//       { erro: 'Dados inválidos.', codigo: 'VALIDACAO', detalhes: err.flatten() },
//       { status: 422 },
//     )
//   }
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { erro: err.message, codigo: err.codigo, detalhes: err.detalhes },
      { status: err.status },
    )
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapeado = PRISMA_ERROS[err.code]
    if (mapeado) {
      const { status, ...corpo } = mapeado
      return NextResponse.json(corpo, { status })
    }
  }

  // Sem console: o erro inesperado vira métrica no canal de observabilidade
  // (OTel) — log solto não carrega trace nem chega ao dashboard.
  errosNaoTratadosTotal.add(1, { codigo: 'INTERNO' })
  return NextResponse.json({ erro: 'Erro interno.', codigo: 'INTERNO' }, { status: 500 })
}

// Envolve o corpo do route handler: executa e mapeia erros para resposta.
export async function handleRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err) {
    return toErrorResponse(err)
  }
}
