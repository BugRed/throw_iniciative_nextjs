import { getSession } from '@/server/auth/session'
import { AppError } from '@/server/http/errors'
import {
  alternarVisibilidade,
  atualizarPersonagem,
  buscarPersonagem,
  criarPersonagem,
  listarPersonagens,
  type PersonagemCompleto,
  type PersonagemResumo,
} from '@/server/personagens/personagens.service'
import {
  listarBackgrounds,
  listarClassesParaWizard,
  listarEquipamentos,
  listarEspecies,
  listarMagias,
  listarSubclasses,
} from '@/server/srd/srd.service'
import type { DadosWizard } from '@/shared/components/organisms/character-wizard-tipos'

// Orquestração: sessão → service. A rota/action só traduz HTTP/form; erros de
// domínio (AppError) atravessam com status/código e são convertidos na borda.

async function exigirUserId(): Promise<string> {
  const sessao = await getSession()
  if (!sessao) throw new AppError('Sessão necessária.', 401, 'SEM_SESSAO')
  return sessao.user.id
}

// Listas do wizard de criação: compõe as consultas somente leitura do SRD e
// modela no formato que a página desce por prop (spec: leitura RSC via controller).
export async function controlarDadosWizard(): Promise<DadosWizard> {
  const [especies, classes, subclasses, backgrounds, magias, equipamentos] = await Promise.all([
    listarEspecies(),
    listarClassesParaWizard(),
    listarSubclasses(),
    listarBackgrounds(),
    listarMagias({ nivelMaximo: 1 }),
    listarEquipamentos(),
  ])

  return {
    especies: especies.map(paraOpcao),
    classes,
    subclasses: subclasses.map((s) => ({ slug: s.slug, name: s.name, classeSlug: s.classeSlug })),
    backgrounds: backgrounds.map(paraOpcao),
    magiasNivel1: magias.map((m) => ({
      slug: m.slug,
      name: m.name,
      extra: m.level === 0 ? 'truque' : 'nv 1',
    })),
    equipamentos: equipamentos.map(paraOpcao),
  }
}

function paraOpcao(item: { slug: string; name: string }) {
  return { slug: item.slug, name: item.name }
}

export async function controlarCriacao(entrada: unknown): Promise<PersonagemResumo> {
  return criarPersonagem(await exigirUserId(), entrada)
}

export async function controlarListagem(): Promise<PersonagemResumo[]> {
  return listarPersonagens(await exigirUserId())
}

export async function controlarBusca(id: string): Promise<PersonagemCompleto> {
  return buscarPersonagem(id, await exigirUserId())
}

export async function controlarEdicao(id: string, entrada: unknown): Promise<PersonagemResumo> {
  return atualizarPersonagem(await exigirUserId(), id, entrada)
}

export async function controlarToggleVisibilidade(id: string): Promise<PersonagemResumo> {
  return alternarVisibilidade(await exigirUserId(), id)
}
