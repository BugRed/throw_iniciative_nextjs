import { controlarListagem } from '@/server/personagens/personagens.controller'
import { Button } from '@/shared/components/atoms/Button'
import { CharacterCard } from '@/shared/components/molecules/CharacterCard'

export const dynamic = 'force-dynamic'

export default async function CharactersPage() {
  const personagens = await controlarListagem()

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">Seus personagens</h1>
        <Button href="/characters/new">Nova ficha</Button>
      </div>
      {personagens.length === 0 ? (
        <p className="font-serif text-ink-500">
          Nenhuma ficha ainda — monte a primeira pelo wizard em poucos minutos.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {personagens.map((personagem) => (
            <CharacterCard key={personagem.id} personagem={personagem} />
          ))}
        </div>
      )}
    </main>
  )
}
