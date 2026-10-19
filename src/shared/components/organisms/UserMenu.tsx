'use client'

import { useRouter } from 'next/navigation'

import { Avatar } from '@/shared/components/atoms/Avatar'
import { Button } from '@/shared/components/atoms/Button'
import { authClient } from '@/shared/lib/auth-client'

export function UserMenu({
  nome,
  email,
  imagem,
}: {
  nome: string
  email: string
  imagem?: string
}) {
  const router = useRouter()

  async function sair() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden font-sans text-sm text-paper-200 sm:inline" title={email}>
        {nome}
      </span>
      <Avatar nome={nome} src={imagem} tamanho="sm" />
      <Button variant="gold" size="sm" onClick={sair}>
        Sair
      </Button>
    </div>
  )
}
