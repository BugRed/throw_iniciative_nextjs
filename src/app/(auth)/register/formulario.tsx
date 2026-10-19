'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import { authClient } from '@/shared/lib/auth-client'

function ContaCriada({ ambienteDev }: { ambienteDev: boolean }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <p className="font-serif text-lg text-ink-900">
        Conta criada! Confirme seu e-mail pelo link que enviamos para entrar.
      </p>
      {ambienteDev ? (
        <p className="font-sans text-sm text-ink-500">
          Em dev, o link está em{' '}
          <Link href="/dev/caixa-de-entrada" className="text-wine-500 hover:underline">
            /dev/caixa-de-entrada
          </Link>
          .
        </p>
      ) : null}
      <Link href="/login" className="font-sans text-sm text-wine-500 hover:underline">
        Voltar para o login
      </Link>
    </div>
  )
}

export function FormularioRegistro({ ambienteDev }: { ambienteDev: boolean }) {
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setCarregando(true)
    setErro('')

    const { error } = await authClient.signUp.email({
      name: String(dados.get('nome')),
      email: String(dados.get('email')),
      password: String(dados.get('senha')),
    })

    setCarregando(false)
    if (error) {
      setErro(error.message ?? 'Não foi possível criar a conta.')
      return
    }
    setCriado(true)
  }

  if (criado) {
    return <ContaCriada ambienteDev={ambienteDev} />
  }

  return (
    <form onSubmit={registrar} className="flex w-full max-w-sm flex-col gap-4">
      <Input name="nome" rotulo="Nome" required autoComplete="name" />
      <Input name="email" type="email" rotulo="E-mail" required autoComplete="email" />
      <Input
        name="senha"
        type="password"
        rotulo="Senha (mínimo 8 caracteres)"
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
        Criar conta
      </Button>
      <Link href="/login" className="text-center font-sans text-sm text-wine-500 hover:underline">
        Já tenho conta
      </Link>
    </form>
  )
}
