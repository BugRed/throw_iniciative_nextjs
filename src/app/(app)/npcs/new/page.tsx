import { acaoCriarMolde } from '@/app/(app)/npcs/actions'
import { controlarStatsMonstro } from '@/server/npcs/npcs.controller'
import { MoldeNpcForm } from '@/shared/components/organisms/MoldeNpcForm'

export const dynamic = 'force-dynamic'

const MOLDE_VAZIO = { nome: '', hpMax: 10, armorClass: 10, initiativeMod: 0 }

export default async function NewNpcTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ monstro?: string }>
}) {
  const { monstro } = await searchParams
  const stats = monstro ? await controlarStatsMonstro(monstro) : null
  const inicial = stats
    ? {
        monstroSlug: stats.slug,
        nome: stats.nome,
        hpMax: stats.hpMax,
        armorClass: stats.armorClass,
        initiativeMod: stats.initiativeMod,
      }
    : MOLDE_VAZIO

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-900">
        {stats ? `Molde a partir de ${stats.nome}` : 'Novo molde de NPC'}
      </h1>
      <MoldeNpcForm inicial={inicial} acao={acaoCriarMolde} />
    </main>
  )
}
