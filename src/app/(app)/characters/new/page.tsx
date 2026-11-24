import { acaoCriarNpcAventureiro, acaoCriarPersonagem } from '@/app/(app)/characters/actions'
import { controlarDadosWizard } from '@/server/personagens/personagens.controller'
import { CharacterWizard } from '@/shared/components/organisms/CharacterWizard'

export const dynamic = 'force-dynamic'

export default async function NewCharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const ehNpc = (await searchParams).tipo === 'npc'
  const dados = await controlarDadosWizard()

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-900">
        {ehNpc ? 'Novo NPC aventureiro' : 'Nova ficha'}
      </h1>
      <CharacterWizard
        dados={dados}
        acao={ehNpc ? acaoCriarNpcAventureiro : acaoCriarPersonagem}
        ehNpc={ehNpc}
      />
    </main>
  )
}
