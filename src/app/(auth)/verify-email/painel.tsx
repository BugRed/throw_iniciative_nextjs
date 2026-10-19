'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { authClient } from '@/shared/lib/auth-client'

type EstadoVerificacao = 'aguardando' | 'verificado' | 'invalido'

export function PainelVerificacao() {
  const parametros = useSearchParams()
  const token = parametros.get('token')
  // Estado inicial derivado do token: sem token não há o que verificar, e
  // derivar no render evita setState síncrono dentro do effect.
  const [estado, setEstado] = useState<EstadoVerificacao>(token ? 'aguardando' : 'invalido')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelado = false
    authClient.verifyEmail({ query: { token } }).then(({ error }) => {
      if (!cancelado) {
        setEstado(error ? 'invalido' : 'verificado')
      }
    })
    return () => {
      cancelado = true
    }
  }, [token])

  if (estado === 'aguardando') {
    return <p className="font-serif text-ink-500">Verificando seu e-mail…</p>
  }

  if (estado === 'invalido') {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <p className="font-serif text-lg text-ink-900">
          Link inválido ou expirado. Solicite um novo entrando e pedindo o reenvio, ou registre-se
          de novo.
        </p>
        <Link href="/login" className="font-sans text-sm text-wine-500 hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <p className="font-serif text-lg text-ink-900">E-mail verificado! 🎉</p>
      <Link href="/login" className="font-sans text-sm text-wine-500 hover:underline">
        Entrar
      </Link>
    </div>
  )
}
