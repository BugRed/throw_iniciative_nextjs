'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import { authClient } from '@/shared/lib/auth-client'

function SenhaRedefinida() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <p className="font-serif text-lg text-ink-900">Senha redefinida!</p>
      <Link href="/login" className="font-sans text-sm text-wine-500 hover:underline">
        Entrar com a nova senha
      </Link>
    </div>
  )
}

export function PainelRedefinicao() {
  const parametros = useSearchParams()
  const token = parametros.get('token')
  const [erro, setErro] = useState('')
  const [redefinida, setRedefinida] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function redefinir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!token) {
      setErro('Link inválido — solicite uma nova redefinição.')
      return
    }
    const dados = new FormData(evento.currentTarget)
    setCarregando(true)
    setErro('')

    const { error } = await authClient.resetPassword({
      newPassword: String(dados.get('senha')),
      token,
    })

    setCarregando(false)
    if (error) {
      setErro(error.message ?? 'Não foi possível redefinir a senha.')
      return
    }
    setRedefinida(true)
  }

  if (redefinida) {
    return <SenhaRedefinida />
  }

  return (
    <form onSubmit={redefinir} className="flex w-full max-w-sm flex-col gap-4">
      <Input
        name="senha"
        type="password"
        rotulo="Nova senha (mínimo 8 caracteres)"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {erro ? (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {erro}
        </p>
      ) : null}
      <Button type="submit" disabled={carregando}>
        Redefinir senha
      </Button>
    </form>
  )
}
