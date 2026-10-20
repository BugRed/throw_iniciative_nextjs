import { notFound } from 'next/navigation'

import { acaoAlternarVisibilidade, acaoEditarPersonagem } from '@/app/(app)/characters/actions'
import { getSession } from '@/server/auth/session'
import { NotFoundError } from '@/server/http/errors'
import { controlarBusca } from '@/server/personagens/personagens.controller'
import { CharacterSheet } from '@/shared/components/organisms/CharacterSheet'
import { FichaAcoes } from '@/shared/components/organisms/FichaAcoes'

export const dynamic = 'force-dynamic'

export default async function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessao = await getSession()
  if (!sessao) notFound()

  let ficha
  try {
    ficha = await controlarBusca(id)
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound()
    throw erro
  }

  const ehDono = ficha.ownerUserId === sessao.user.id

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <CharacterSheet ficha={ficha} />
      {ehDono && (
        <FichaAcoes
          id={ficha.id}
          nome={ficha.name}
          nivel={ficha.level}
          visivel={ficha.isVisibleToMaster}
          acaoEditar={acaoEditarPersonagem}
          acaoAlternarVisibilidade={acaoAlternarVisibilidade}
        />
      )}
    </main>
  )
}
