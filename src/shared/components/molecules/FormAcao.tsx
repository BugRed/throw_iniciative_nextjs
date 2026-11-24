'use client'

import { type ReactNode, useActionState } from 'react'

import { Button, type ButtonSize, type ButtonVariant } from '@/shared/components/atoms/Button'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

// Formulário de uma Server Action: campos fixos vão como hidden, campos
// editáveis entram como filhos, e o erro devolvido pela action aparece abaixo.

export type FormAcaoProps = {
  acao: AcaoFormulario
  rotulo: string
  campos?: Record<string, string>
  variante?: ButtonVariant
  tamanho?: ButtonSize
  // Ação destrutiva pede confirmação antes de enviar.
  confirmar?: string
  children?: ReactNode
}

export function FormAcao({
  acao,
  rotulo,
  campos = {},
  variante = 'secondary',
  tamanho = 'sm',
  confirmar,
  children,
}: FormAcaoProps) {
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acao, null)

  return (
    <form
      action={submeter}
      onSubmit={(evento) => {
        if (confirmar && !window.confirm(confirmar)) evento.preventDefault()
      }}
      className="flex flex-wrap items-end gap-2"
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      {children}
      <Button type="submit" variant={variante} size={tamanho}>
        {rotulo}
      </Button>
      {estado && 'erro' in estado && (
        <p role="alert" className="w-full font-sans text-xs text-fire-600">
          {estado.erro}
        </p>
      )}
    </form>
  )
}
