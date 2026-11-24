import type { NpcTemplate } from '@prisma/client'

import { getSession } from '@/server/auth/session'
import { AppError } from '@/server/http/errors'
import {
  buscarStatsMonstro,
  criarMolde,
  excluirMolde,
  listarMoldes,
  type StatsMonstro,
} from '@/server/npcs/npcs.service'
import { listarMonstros, type SrdMonstroResumo } from '@/server/srd/srd.service'

// Orquestração: sessão → service. Qualquer usuário logado cria NPC
// (docs/negocio/npcs.md); a sessão é a única exigência.

async function exigirUserId(): Promise<string> {
  const sessao = await getSession()
  if (!sessao) throw new AppError('Sessão necessária.', 401, 'SEM_SESSAO')
  return sessao.user.id
}

export async function controlarCatalogo(): Promise<SrdMonstroResumo[]> {
  await exigirUserId()
  return listarMonstros()
}

export async function controlarStatsMonstro(slug: string): Promise<StatsMonstro> {
  await exigirUserId()
  return buscarStatsMonstro(slug)
}

export async function controlarCriacaoMolde(entrada: unknown): Promise<NpcTemplate> {
  return criarMolde(await exigirUserId(), entrada)
}

export async function controlarMoldes(): Promise<NpcTemplate[]> {
  return listarMoldes(await exigirUserId())
}

export async function controlarExclusaoMolde(id: string): Promise<void> {
  return excluirMolde(await exigirUserId(), id)
}
