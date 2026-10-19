import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'

import {
  AppError,
  ConflictError,
  handleRoute,
  NotFoundError,
  toErrorResponse,
  ValidationError,
} from '@/server/http/errors'

async function corpo(resposta: NextResponse): Promise<Record<string, unknown>> {
  return (await resposta.json()) as Record<string, unknown>
}

describe('toErrorResponse — erros de domínio', () => {
  it('mapeia erro de domínio com status e código próprios', async () => {
    const resposta = toErrorResponse(new NotFoundError())
    expect(resposta.status).toBe(404)
    expect(await corpo(resposta)).toEqual({
      erro: 'Recurso não encontrado.',
      codigo: 'NAO_ENCONTRADO',
    })
  })

  it('carrega mensagem e detalhes de ValidationError', async () => {
    const resposta = toErrorResponse(new ValidationError('Campo inválido.', { campo: 'nome' }))
    expect(resposta.status).toBe(422)
    const json = await corpo(resposta)
    expect(json.erro).toBe('Campo inválido.')
    expect(json.detalhes).toEqual({ campo: 'nome' })
  })

  it('AppError arbitrário preserva status e código definidos', async () => {
    const resposta = toErrorResponse(new AppError('Cobrando o servidor demais.', 429, 'RATE_LIMIT'))
    expect(resposta.status).toBe(429)
    expect((await corpo(resposta)).codigo).toBe('RATE_LIMIT')
  })

  it('erro inesperado vira 500 sem vazar detalhes internos', async () => {
    const resposta = toErrorResponse(new Error('segredo do banco'))
    expect(resposta.status).toBe(500)
    const json = await corpo(resposta)
    expect(json.erro).toBe('Erro interno.')
    expect(JSON.stringify(json)).not.toContain('segredo')
  })
})

describe('toErrorResponse — erros do Prisma', () => {
  it('converte conflito único (P2002) em 409', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    })
    const resposta = toErrorResponse(erro)
    expect(resposta.status).toBe(409)
    expect((await corpo(resposta)).codigo).toBe('CONFLITO')
  })

  it('converte registro ausente (P2025) em 404', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    })
    expect(toErrorResponse(erro).status).toBe(404)
  })

  it('código Prisma desconhecido cai no 500 genérico', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Outro caso', {
      code: 'P3009',
      clientVersion: 'test',
    })
    const resposta = toErrorResponse(erro)
    expect(resposta.status).toBe(500)
    expect((await corpo(resposta)).erro).toBe('Erro interno.')
  })
})

describe('handleRoute', () => {
  it('devolve a resposta quando o handler termina bem', async () => {
    const ok = NextResponse.json({ status: 'ok' })
    await expect(handleRoute(async () => ok)).resolves.toBe(ok)
  })

  it('converte erro lançado pelo handler em resposta de erro', async () => {
    const resposta = await handleRoute(async () => {
      throw new ConflictError()
    })
    expect(resposta.status).toBe(409)
  })
})
