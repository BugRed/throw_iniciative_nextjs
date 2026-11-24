import { acaoExcluirMolde } from '@/app/(app)/npcs/actions'
import { controlarCatalogo, controlarMoldes } from '@/server/npcs/npcs.controller'
import { Button } from '@/shared/components/atoms/Button'
import { MoldesNpc } from '@/shared/components/organisms/MoldesNpc'

export const dynamic = 'force-dynamic'

export default async function NpcsPage() {
  const [moldes, catalogo] = await Promise.all([controlarMoldes(), controlarCatalogo()])

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">NPCs de respawn</h1>
        <Button href="/npcs/new" variant="secondary">
          Molde do zero
        </Button>
      </div>
      <MoldesNpc moldes={moldes} catalogo={catalogo} acaoExcluir={acaoExcluirMolde} />
    </main>
  )
}
