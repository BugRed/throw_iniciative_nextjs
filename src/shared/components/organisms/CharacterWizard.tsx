'use client'

import { useRouter } from 'next/navigation'
import {
  type Dispatch,
  type ReactNode,
  useActionState,
  useEffect,
  useReducer,
  useState,
} from 'react'

import { ATRIBUTOS, custoTotalPointBuy } from '@/server/personagens/personagens.schema'
import { Button } from '@/shared/components/atoms/Button'
import { StepIndicator } from '@/shared/components/molecules/StepIndicator'
import {
  type ClasseWizard,
  type DadosWizard,
  ESTADO_INICIAL,
  type EstadoWizard,
  ETAPAS,
} from '@/shared/components/organisms/character-wizard-tipos'
import {
  EtapaAtributos,
  EtapaEscolha,
  EtapaInfo,
  EtapaMultipla,
  EtapaRevisao,
  type Opcao,
} from '@/shared/components/organisms/etapas-wizard'
import type { AcaoFormulario } from '@/shared/lib/estado-acao'

// O organismo guarda todo o estado do wizard (um form acumulado) e desce
// estado + callbacks por prop para as etapas presentacionais.

type Selecao = 'pericias' | 'magias' | 'equipamento'

type AcaoWizard =
  | { tipo: 'atualizar'; patch: Partial<EstadoWizard> }
  | { tipo: 'atributo'; atributo: (typeof ATRIBUTOS)[number]; delta: number }
  | { tipo: 'alternar'; campo: Selecao; slug: string; maximo?: number }
  | { tipo: 'etapa'; indice: number }

function reducerWizard(estado: EstadoWizard, acao: AcaoWizard): EstadoWizard {
  switch (acao.tipo) {
    case 'atualizar':
      return { ...estado, ...acao.patch }
    case 'atributo':
      return {
        ...estado,
        atributos: {
          ...estado.atributos,
          [acao.atributo]: Math.min(15, Math.max(8, estado.atributos[acao.atributo] + acao.delta)),
        },
      }
    case 'alternar':
      return { ...estado, [acao.campo]: alternarLista(estado[acao.campo], acao.slug, acao.maximo) }
    case 'etapa':
      return { ...estado, etapa: acao.indice }
  }
}

function alternarLista(lista: string[], slug: string, maximo?: number): string[] {
  if (lista.includes(slug)) return lista.filter((s) => s !== slug)
  if (maximo === undefined || lista.length < maximo) return [...lista, slug]
  return lista
}

function validarEtapa(etapa: number, estado: EstadoWizard, classeAtual?: ClasseWizard): string {
  if (etapa === 0) return estado.especie ? '' : 'Escolha uma espécie.'
  if (etapa === 1) return estado.classe ? '' : 'Escolha uma classe.'
  if (etapa === 3) return estado.background ? '' : 'Escolha um antecedente.'
  if (etapa === 4)
    return custoTotalPointBuy(estado.atributos) <= 27 ? '' : 'Distribua no máximo 27 pontos.'
  if (etapa === 5 && classeAtual)
    return estado.pericias.length <= classeAtual.pericias.escolher
      ? ''
      : 'Perícias além do permitido pela classe.'
  return ''
}

function nomeDe(opcoes: Opcao[], slug: string): string {
  return opcoes.find((o) => o.slug === slug)?.name ?? '—'
}

function resumoRevisao(
  dados: DadosWizard,
  estado: EstadoWizard,
  classeAtual?: ClasseWizard,
): Array<[string, string]> {
  return [
    ['Espécie', nomeDe(dados.especies, estado.especie)],
    ['Classe', `${nomeDe(dados.classes, estado.classe)} (d${classeAtual?.hitDie ?? '—'})`],
    ['Antecedente', nomeDe(dados.backgrounds, estado.background)],
    ['Atributos', ATRIBUTOS.map((a) => estado.atributos[a]).join(' · ')],
    ['Perícias', estado.pericias.length ? estado.pericias.join(', ') : '—'],
    ['Magias', estado.magias.length ? `${estado.magias.length} selecionadas` : '—'],
  ]
}

// Campos acumulados: sempre montados no form, a etapa só controla o que se vê.
function CamposAcumulados({ estado }: { estado: EstadoWizard }) {
  return (
    <>
      <input type="hidden" name="especie" value={estado.especie} />
      <input type="hidden" name="classe" value={estado.classe} />
      <input type="hidden" name="background" value={estado.background} />
      {ATRIBUTOS.map((a) => (
        <input key={a} type="hidden" name={a} value={estado.atributos[a]} />
      ))}
      {estado.pericias.map((s) => (
        <input key={`per-${s}`} type="hidden" name="pericias" value={s} />
      ))}
      {estado.magias.map((s) => (
        <input key={`mag-${s}`} type="hidden" name="magias" value={s} />
      ))}
      {estado.equipamento.map((s) => (
        <input key={`eq-${s}`} type="hidden" name="equipamento" value={s} />
      ))}
    </>
  )
}

type ContextoEtapa = {
  dados: DadosWizard
  estado: EstadoWizard
  classeAtual?: ClasseWizard
  subclassesDaClasse: Array<Opcao & { classeSlug: string }>
  atualizar: (patch: Partial<EstadoWizard>) => void
  mudarAtributo: (atributo: (typeof ATRIBUTOS)[number], delta: number) => void
  alternarSelecao: (campo: Selecao, slug: string, maximo?: number) => void
}

const MSG_SUBCLASSE =
  'No SRD 5.2 a subclasse é escolhida no nível 3 — as opções da sua classe ficam aqui para depois.'
const MSG_SEM_MAGIA = 'Sua classe não conjura magias no nível 1.'

const CORPO_ETAPA: Array<(c: ContextoEtapa) => ReactNode> = [
  (c) => (
    <EtapaEscolha
      titulo="Espécie"
      opcoes={c.dados.especies}
      valor={c.estado.especie}
      onChange={(slug) => c.atualizar({ especie: slug })}
    />
  ),
  (c) => (
    <EtapaEscolha
      titulo="Classe"
      opcoes={c.dados.classes.map((cl) => ({
        slug: cl.slug,
        name: cl.name,
        extra: `d${cl.hitDie}`,
      }))}
      valor={c.estado.classe}
      onChange={(slug) => c.atualizar({ classe: slug })}
    />
  ),
  (c) => <EtapaInfo titulo="Subclasse" paragrafos={[MSG_SUBCLASSE]} itens={c.subclassesDaClasse} />,
  (c) => (
    <EtapaEscolha
      titulo="Antecedente"
      opcoes={c.dados.backgrounds}
      valor={c.estado.background}
      onChange={(slug) => c.atualizar({ background: slug })}
    />
  ),
  (c) => <EtapaAtributos valores={c.estado.atributos} onChange={c.mudarAtributo} />,
  (c) =>
    c.classeAtual ? (
      <EtapaMultipla
        titulo="Perícias"
        descricao={`Escolha até ${c.classeAtual.pericias.escolher} perícias da classe.`}
        opcoes={c.classeAtual.pericias.opcoes}
        selecionados={c.estado.pericias}
        onToggle={(slug) => c.alternarSelecao('pericias', slug, c.classeAtual?.pericias.escolher)}
        maximo={c.classeAtual.pericias.escolher}
      />
    ) : null,
  (c) =>
    c.classeAtual?.caster ? (
      <EtapaMultipla
        titulo="Magias"
        descricao="Truques e magias de 1º nível do SRD (a lista completa fica na ficha)."
        opcoes={c.dados.magiasNivel1}
        selecionados={c.estado.magias}
        onToggle={(slug) => c.alternarSelecao('magias', slug)}
      />
    ) : (
      <EtapaInfo titulo="Magias" paragrafos={[MSG_SEM_MAGIA]} />
    ),
  (c) => (
    <EtapaMultipla
      titulo="Equipamento"
      descricao="Marque o que carrega; a sugestão oficial da classe chega com a gestão de equipamento."
      opcoes={c.dados.equipamentos}
      selecionados={c.estado.equipamento}
      onToggle={(slug) => c.alternarSelecao('equipamento', slug)}
    />
  ),
  () => (
    <EtapaInfo
      titulo="Feats"
      paragrafos={[
        'Nível 1 não dá feat de classe no SRD 5.2 — a feat de origem vem do antecedente.',
        'Ao subir de nível (edição da ficha), feats passam a ser escolhíveis.',
      ]}
    />
  ),
  (c) => (
    <EtapaRevisao
      nome={c.estado.nome}
      onNome={(valor) => c.atualizar({ nome: valor })}
      visivel={c.estado.visivel}
      onVisivel={(valor) => c.atualizar({ visivel: valor })}
      resumo={resumoRevisao(c.dados, c.estado, c.classeAtual)}
    />
  ),
]

function NavegacaoWizard({
  etapa,
  onVoltar,
  onAvancar,
}: {
  etapa: number
  onVoltar: () => void
  onAvancar: () => void
}) {
  return (
    <div className="flex justify-between">
      <Button type="button" variant="ghost" onClick={onVoltar} disabled={etapa === 0}>
        Voltar
      </Button>
      {etapa < ETAPAS.length - 1 ? (
        <Button type="button" onClick={onAvancar}>
          Avançar
        </Button>
      ) : (
        <Button type="submit">Criar ficha</Button>
      )}
    </div>
  )
}

function contextoWizard(
  dados: DadosWizard,
  estado: EstadoWizard,
  classeAtual: ClasseWizard | undefined,
  subclassesDaClasse: Array<Opcao & { classeSlug: string }>,
  despachar: Dispatch<AcaoWizard>,
): ContextoEtapa {
  return {
    dados,
    estado,
    classeAtual,
    subclassesDaClasse,
    atualizar: (patch) => despachar({ tipo: 'atualizar', patch }),
    mudarAtributo: (atributo, delta) => despachar({ tipo: 'atributo', atributo, delta }),
    alternarSelecao: (campo, slug, maximo) => despachar({ tipo: 'alternar', campo, slug, maximo }),
  }
}

export function CharacterWizard({ dados, acao }: { dados: DadosWizard; acao: AcaoFormulario }) {
  const router = useRouter()
  const [estado, despachar] = useReducer(reducerWizard, ESTADO_INICIAL)
  const [erroEtapa, setErroEtapa] = useState('')
  const [estadoAcao, submeter] = useActionState(acao, null)

  const classeAtual = dados.classes.find((c) => c.slug === estado.classe)
  const subclassesDaClasse = dados.subclasses.filter((s) => s.classeSlug === estado.classe)
  const erro = erroEtapa || (estadoAcao && 'erro' in estadoAcao ? estadoAcao.erro : '')

  useEffect(() => {
    if (estadoAcao && 'ok' in estadoAcao && estadoAcao.id)
      router.push(`/characters/${estadoAcao.id}`)
  }, [estadoAcao, router])

  function avancar() {
    const falha = validarEtapa(estado.etapa, estado, classeAtual)
    setErroEtapa(falha)
    if (!falha) despachar({ tipo: 'etapa', indice: Math.min(estado.etapa + 1, ETAPAS.length - 1) })
  }

  const contexto = contextoWizard(dados, estado, classeAtual, subclassesDaClasse, despachar)

  return (
    <form action={submeter} className="flex flex-col gap-6">
      <StepIndicator
        etapas={ETAPAS}
        atual={estado.etapa}
        onPular={(indice) => despachar({ tipo: 'etapa', indice })}
      />
      <CamposAcumulados estado={estado} />
      <div className="min-h-40">
        {CORPO_ETAPA[estado.etapa]?.(contexto) ?? null}
        <input type="hidden" name="nome" value={estado.nome} />
        <input type="hidden" name="visivelAoMestre" value={estado.visivel ? 'on' : 'off'} />
      </div>
      {erro && (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {erro}
        </p>
      )}
      <NavegacaoWizard
        etapa={estado.etapa}
        onVoltar={() => despachar({ tipo: 'etapa', indice: Math.max(0, estado.etapa - 1) })}
        onAvancar={avancar}
      />
    </form>
  )
}
