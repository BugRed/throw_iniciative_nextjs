'use client'

// Etapas presentacionais do wizard de personagem. Cada uma recebe estado e
// callbacks por prop — o organismo CharacterWizard guarda o estado.

import { ATRIBUTOS, custoTotalPointBuy } from '@/server/personagens/personagens.schema'
import { Checkbox } from '@/shared/components/atoms/Checkbox'
import { Input } from '@/shared/components/atoms/Input'

export type Opcao = { slug: string; name: string; extra?: string }

export function EtapaEscolha({
  titulo,
  opcoes,
  valor,
  onChange,
  vazio,
}: {
  titulo: string
  opcoes: Opcao[]
  valor: string
  onChange: (slug: string) => void
  vazio?: string
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-lg text-ink-900">{titulo}</legend>
      {vazio && <p className="font-serif text-sm text-ink-500">{vazio}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((opcao) => (
          <label
            key={opcao.slug}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 font-sans text-sm ${
              valor === opcao.slug ? 'border-gold-500 bg-gold-100' : 'border-paper-300 bg-paper-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name={titulo}
                value={opcao.slug}
                checked={valor === opcao.slug}
                onChange={() => onChange(opcao.slug)}
                className="accent-wine-600"
              />
              {opcao.name}
            </span>
            {opcao.extra && <span className="font-mono text-xs text-ink-500">{opcao.extra}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function EtapaAtributos({
  valores,
  onChange,
}: {
  valores: Record<(typeof ATRIBUTOS)[number], number>
  onChange: (atributo: (typeof ATRIBUTOS)[number], delta: number) => void
}) {
  const rotulos: Record<(typeof ATRIBUTOS)[number], string> = {
    forca: 'Força',
    destreza: 'Destreza',
    constituicao: 'Constituição',
    inteligencia: 'Inteligência',
    sabedoria: 'Sabedoria',
    carisma: 'Carisma',
  }
  const gasto = custoTotalPointBuy(valores)
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-display text-lg text-ink-900">Distribua 27 pontos (8–15 cada)</legend>
      <p className="font-mono text-sm text-wine-600">
        Pontos gastos: {gasto} / 27 {gasto > 27 && '· passa do limite!'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ATRIBUTOS.map((atributo) => (
          <LinhaAtributo
            key={atributo}
            atributo={atributo}
            rotulo={rotulos[atributo]}
            valor={valores[atributo]}
            onChange={onChange}
          />
        ))}
      </div>
    </fieldset>
  )
}

function LinhaAtributo({
  atributo,
  rotulo,
  valor,
  onChange,
}: {
  atributo: (typeof ATRIBUTOS)[number]
  rotulo: string
  valor: number
  onChange: (atributo: (typeof ATRIBUTOS)[number], delta: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-paper-300 px-4 py-2">
      <span className="font-sans text-sm">{rotulo}</span>
      <span className="flex items-center gap-2 font-mono text-sm">
        <button
          type="button"
          aria-label={`Diminuir ${rotulo}`}
          onClick={() => onChange(atributo, -1)}
          className="rounded border border-paper-400 px-2"
        >
          −
        </button>
        {valor}
        <button
          type="button"
          aria-label={`Aumentar ${rotulo}`}
          onClick={() => onChange(atributo, 1)}
          className="rounded border border-paper-400 px-2"
        >
          +
        </button>
      </span>
    </div>
  )
}

export function EtapaMultipla({
  titulo,
  descricao,
  opcoes,
  selecionados,
  onToggle,
  maximo,
}: {
  titulo: string
  descricao?: string
  opcoes: Opcao[]
  selecionados: string[]
  onToggle: (slug: string) => void
  maximo?: number
}) {
  const noLimite = maximo !== undefined && selecionados.length >= maximo
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-lg text-ink-900">{titulo}</legend>
      {descricao && <p className="font-serif text-sm text-ink-500">{descricao}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((opcao) => (
          <LinhaOpcaoMultipla
            key={opcao.slug}
            opcao={opcao}
            selecionado={selecionados.includes(opcao.slug)}
            bloqueado={!selecionados.includes(opcao.slug) && noLimite}
            onToggle={onToggle}
          />
        ))}
      </div>
      {maximo !== undefined && (
        <p className="font-sans text-xs text-ink-400">
          {selecionados.length} / {maximo} escolhidos
        </p>
      )}
    </fieldset>
  )
}

function LinhaOpcaoMultipla({
  opcao,
  selecionado,
  bloqueado,
  onToggle,
}: {
  opcao: Opcao
  selecionado: boolean
  bloqueado: boolean
  onToggle: (slug: string) => void
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-2 font-sans text-sm ${
        selecionado ? 'border-gold-500 bg-gold-100' : 'border-paper-300 bg-paper-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={() => onToggle(opcao.slug)}
          disabled={bloqueado}
          className="size-4 accent-wine-500"
        />
        {opcao.name}
      </span>
      {opcao.extra && <span className="font-mono text-xs text-ink-500">{opcao.extra}</span>}
    </label>
  )
}

export function EtapaInfo({
  titulo,
  paragrafos,
  itens,
}: {
  titulo: string
  paragrafos: string[]
  itens?: Opcao[]
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-lg text-ink-900">{titulo}</legend>
      {paragrafos.map((p) => (
        <p key={p} className="font-serif text-sm text-ink-600">
          {p}
        </p>
      ))}
      {itens && itens.length > 0 && (
        <ul className="flex flex-col gap-1 font-sans text-sm text-ink-500">
          {itens.map((item) => (
            <li key={item.slug}>· {item.name}</li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}

export function EtapaRevisao({
  nome,
  onNome,
  visivel,
  onVisivel,
  resumo,
}: {
  nome: string
  onNome: (valor: string) => void
  visivel: boolean
  onVisivel: (valor: boolean) => void
  resumo: Array<[string, string]>
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-display text-lg text-ink-900">Revisão e nome</legend>
      <Input
        id="nome-personagem"
        rotulo="Nome do personagem"
        value={nome}
        onChange={(e) => onNome(e.target.value)}
        required
        maxLength={50}
      />
      <Checkbox
        rotulo="Mestre pode ver a ficha completa"
        checked={visivel}
        onChange={() => onVisivel(!visivel)}
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-md border border-gold-200 bg-paper-50 px-4 py-3 font-sans text-sm">
        {resumo.map(([chave, valor]) => (
          <div key={chave} className="contents">
            <dt className="text-ink-500">{chave}</dt>
            <dd className="font-mono text-ink-900">{valor}</dd>
          </div>
        ))}
      </dl>
    </fieldset>
  )
}
