'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import { authClient } from '@/shared/lib/auth-client'

function traduzErroLogin(mensagemOriginal: string): string {
  if (mensagemOriginal.toLowerCase().includes('verified')) {
    return 'E-mail não verificado — abra o link de verificação (em dev, /dev/caixa-de-entrada).'
  }
  return 'E-mail ou senha inválidos.'
}

function RodapeLogin() {
  return (
    <div className="flex justify-between font-sans text-sm">
      <Link href="/register" className="text-wine-500 hover:underline">
        Criar conta
      </Link>
      <Link href="/forgot-password" className="text-wine-500 hover:underline">
        Esqueci a senha
      </Link>
    </div>
  )
}

export function FormularioLogin({ discordAtivo }: { discordAtivo: boolean }) {
  const router = useRouter()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setCarregando(true)
    setErro('')

    const { error } = await authClient.signIn.email({
      email: String(dados.get('email')),
      password: String(dados.get('senha')),
    })

    setCarregando(false)
    if (error) {
      setErro(traduzErroLogin(error.message ?? ''))
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function entrarComDiscord() {
    await authClient.signIn.social({ provider: 'discord', callbackURL: '/dashboard' })
  }

  return (
    <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-4">
      <Input name="email" type="email" rotulo="E-mail" required autoComplete="email" />
      <Input name="senha" type="password" rotulo="Senha" required autoComplete="current-password" />
      {erro ? (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {erro}
        </p>
      ) : null}
      <Button type="submit" disabled={carregando}>
        Entrar
      </Button>
      {discordAtivo ? (
        <Button type="button" variant="secondary" onClick={entrarComDiscord}>
          Entrar com Discord
        </Button>
      ) : null}
      <RodapeLogin />
    </form>
  )
}
