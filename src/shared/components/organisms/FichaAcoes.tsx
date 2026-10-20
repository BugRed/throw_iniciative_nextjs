'use client'

import { useActionState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

// Ações da ficha: edição (nome/nível) e toggle de privacidade. Recebe as
// Server Actions por prop — o organismo não conhece a camada app/.

function FormEdicao({
  id,
  nome,
  nivel,
  acaoEditar,
}: {
  id: string
  nome: string
  nivel: number
  acaoEditar: AcaoFormulario
}) {
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acaoEditar, null)

  return (
    <form
      action={submeter}
      className="flex flex-wrap items-end gap-3 rounded-md border border-paper-300 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <Input rotulo="Nome" name="nome" defaultValue={nome} maxLength={50} className="w-48" />
      <Input
        rotulo="Nível"
        name="nivel"
        type="number"
        min={1}
        max={20}
        defaultValue={nivel}
        className="w-20"
      />
      <Button type="submit" variant="secondary" size="sm">
        Salvar
      </Button>
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-xs text-fire-600">
          {estado.erro}
        </p>
      )}
    </form>
  )
}

function FormVisibilidade({
  id,
  visivel,
  acao,
}: {
  id: string
  visivel: boolean
  acao: AcaoFormulario
}) {
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acao, null)

  return (
    <form action={submeter} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm">
        {visivel ? 'Fechar ficha ao mestre' : 'Abrir ficha ao mestre'}
      </Button>
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-xs text-fire-600">
          {estado.erro}
        </p>
      )}
    </form>
  )
}

export function FichaAcoes({
  id,
  nome,
  nivel,
  visivel,
  acaoEditar,
  acaoAlternarVisibilidade,
}: {
  id: string
  nome: string
  nivel: number
  visivel: boolean
  acaoEditar: AcaoFormulario
  acaoAlternarVisibilidade: AcaoFormulario
}) {
  return (
    <div className="flex flex-col gap-4">
      <FormEdicao id={id} nome={nome} nivel={nivel} acaoEditar={acaoEditar} />
      <FormVisibilidade id={id} visivel={visivel} acao={acaoAlternarVisibilidade} />
    </div>
  )
}
