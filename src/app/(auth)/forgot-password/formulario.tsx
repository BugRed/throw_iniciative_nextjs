'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import { authClient } from '@/shared/lib/auth-client'

function SolicitacaoEnviada() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <p className="font-serif text-lg text-ink-900">
        Se o e-mail existir, enviamos um link de redefinição.
      </p>
      <p className="font-sans text-sm text-ink-500">
        Em dev, o link está em{' '}
        <Link href="/dev/caixa-de-entrada" className="text-wine-500 hover:underline">
          /dev/caixa-de-entrada
        </Link>
        .
      </p>
      <Link href="/login" className="font-sans text-sm text-wine-500 hover:underline">
        Voltar para o login
      </Link>
    </div>
  )
}

export function FormularioEsqueci() {
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function solicitar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setCarregando(true)
    setErro('')

    const { error } = await authClient.requestPasswordReset({
      email: String(dados.get('email')),
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setCarregando(false)
    if (error) {
      setErro(error.message ?? 'Não foi possível solicitar a redefinição.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return <SolicitacaoEnviada />
  }

  return (
    <form onSubmit={solicitar} className="flex w-full max-w-sm flex-col gap-4">
      <Input name="email" type="email" rotulo="E-mail da conta" required autoComplete="email" />
      {erro ? (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {erro}
        </p>
      ) : null}
      <Button type="submit" disabled={carregando}>
        Enviar link de redefinição
      </Button>
      <Link href="/login" className="text-center font-sans text-sm text-wine-500 hover:underline">
        Voltar para o login
      </Link>
    </form>
  )
}
