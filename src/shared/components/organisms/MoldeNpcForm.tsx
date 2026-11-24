'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

// Edição do stat block antes de adicionar: parte dos valores do SRD (ou vazio,
// para molde do zero) e grava um molde do usuário — o SRD nunca muda.

export type ValoresMolde = {
  monstroSlug?: string
  nome: string
  hpMax: number
  armorClass: number
  initiativeMod: number
}

export function MoldeNpcForm({ inicial, acao }: { inicial: ValoresMolde; acao: AcaoFormulario }) {
  const router = useRouter()
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acao, null)

  useEffect(() => {
    if (estado && 'ok' in estado) router.push('/npcs')
  }, [estado, router])

  return (
    <form action={submeter} className="flex flex-col gap-4">
      {inicial.monstroSlug && (
        <input type="hidden" name="monstroSlug" value={inicial.monstroSlug} />
      )}
      <Input rotulo="Nome" name="nome" defaultValue={inicial.nome} maxLength={50} required />
      <div className="flex flex-wrap gap-4">
        <Input rotulo="PV máximo" name="hpMax" type="number" min={1} defaultValue={inicial.hpMax} />
        <Input
          rotulo="CA"
          name="armorClass"
          type="number"
          min={0}
          defaultValue={inicial.armorClass}
        />
        <Input
          rotulo="Mod. de iniciativa"
          name="initiativeMod"
          type="number"
          defaultValue={inicial.initiativeMod}
        />
      </div>
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {estado.erro}
        </p>
      )}
      <Button type="submit">Salvar molde</Button>
    </form>
  )
}
