'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

export type MoldeResumo = {
  id: string
  name: string
  hpMax: number
  armorClass: number
  initiativeMod: number
}

export type MonstroCatalogo = {
  slug: string
  name: string
  challengeRating: number | null
}

function LinhaMolde({ molde, acaoExcluir }: { molde: MoldeResumo; acaoExcluir: AcaoFormulario }) {
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acaoExcluir, null)

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-paper-300 px-4 py-2">
      <span className="font-serif text-ink-900">{molde.name}</span>
      <span className="font-mono text-sm text-ink-500">
        PV {molde.hpMax} · CA {molde.armorClass} · Init {molde.initiativeMod >= 0 ? '+' : ''}
        {molde.initiativeMod}
      </span>
      <form action={submeter}>
        <input type="hidden" name="id" value={molde.id} />
        <Button type="submit" variant="ghost" size="sm">
          Excluir
        </Button>
      </form>
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-xs text-fire-600">
          {estado.erro}
        </p>
      )}
    </li>
  )
}

export function MoldesNpc({
  moldes,
  catalogo,
  acaoExcluir,
}: {
  moldes: MoldeResumo[]
  catalogo: MonstroCatalogo[]
  acaoExcluir: AcaoFormulario
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink-900">Seus moldes</h2>
        {moldes.length === 0 ? (
          <p className="font-serif text-ink-500">
            Nenhum molde ainda — escolha um monstro do SRD abaixo e ajuste o stat block.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {moldes.map((molde) => (
              <LinhaMolde key={molde.id} molde={molde} acaoExcluir={acaoExcluir} />
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink-900">Catálogo do SRD</h2>
        <ul className="grid gap-1 sm:grid-cols-2">
          {catalogo.map((monstro) => (
            <li key={monstro.slug}>
              <Link
                href={`/npcs/new?monstro=${monstro.slug}`}
                className="flex justify-between rounded-md px-3 py-1.5 font-sans text-sm text-ink-900 hover:bg-gold-400/20"
              >
                <span>{monstro.name}</span>
                <span className="font-mono text-ink-500">ND {monstro.challengeRating ?? '—'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
