import { modificadorDeAtributo } from '@/server/personagens/calculos'
import { Badge } from '@/shared/components/atoms/Badge'
import { StatPill } from '@/shared/components/atoms/StatPill'

export type FichaDados = {
  id: string
  name: string
  level: number
  isNpc: boolean
  isVisibleToMaster: boolean
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  hpMax: number
  hpCurrent: number
  armorClass: number
  initiativeMod: number
  proficiencyBonus: number
  skillProficiencies: unknown
  preparedSpells: unknown
  equipment: unknown
  feats: unknown
  species: { name: string } | null
  srdClass: { name: string; hitDie: number }
}

const ROTULOS_ATRIBUTOS: Array<[keyof FichaDados, string]> = [
  ['strength', 'Força'],
  ['dexterity', 'Destreza'],
  ['constitution', 'Constituição'],
  ['intelligence', 'Inteligência'],
  ['wisdom', 'Sabedoria'],
  ['charisma', 'Carisma'],
]

function comoLista(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === 'string')
    : []
}

export function CharacterSheet({ ficha }: { ficha: FichaDados }) {
  return (
    <article className="flex flex-col gap-6" aria-label={`Ficha de ${ficha.name}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">{ficha.name}</h1>
          <p className="font-serif text-ink-500">
            {ficha.species?.name ?? '—'} · {ficha.srdClass.name} · Nível {ficha.level}
          </p>
        </div>
        <div className="flex gap-2">
          {ficha.isNpc && <Badge variante="gold">NPC</Badge>}
          <Badge variante={ficha.isVisibleToMaster ? 'moss' : 'fire'}>
            {ficha.isVisibleToMaster ? 'Aberta ao mestre' : 'Fechada ao mestre'}
          </Badge>
        </div>
      </header>

      <section className="flex flex-wrap gap-3" aria-label="Estatísticas de combate">
        <StatPill rotulo="HP" valor={`${ficha.hpCurrent}/${ficha.hpMax}`} />
        <StatPill rotulo="CA" valor={String(ficha.armorClass)} />
        <StatPill
          rotulo="Iniciativa"
          valor={ficha.initiativeMod >= 0 ? `+${ficha.initiativeMod}` : String(ficha.initiativeMod)}
        />
        <StatPill rotulo="Proficiência" valor={`+${ficha.proficiencyBonus}`} />
      </section>

      <GradeAtributos ficha={ficha} />

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Perícias, magias e equipamento">
        <ListaFicha titulo="Perícias" itens={comoLista(ficha.skillProficiencies)} />
        <ListaFicha titulo="Magias preparadas" itens={comoLista(ficha.preparedSpells)} />
        <ListaFicha titulo="Equipamento" itens={comoLista(ficha.equipment)} />
      </section>
    </article>
  )
}

function GradeAtributos({ ficha }: { ficha: FichaDados }) {
  return (
    <section
      aria-label="Atributos"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      {ROTULOS_ATRIBUTOS.map(([campo, rotulo]) => {
        const valor = ficha[campo] as number
        const mod = modificadorDeAtributo(valor)
        return (
          <div
            key={campo}
            className="rounded-md border border-gold-200 bg-paper-50 px-3 py-2 text-center"
          >
            <p className="font-sans text-xs text-ink-500">{rotulo}</p>
            <p className="font-mono text-lg text-ink-900">{valor}</p>
            <p className="font-mono text-xs text-wine-600">{mod >= 0 ? `+${mod}` : mod}</p>
          </div>
        )
      })}
    </section>
  )
}

function ListaFicha({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-md border border-paper-300 px-4 py-3">
      <h2 className="font-display text-sm text-ink-700">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="font-serif text-sm text-ink-400">—</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5 font-serif text-sm text-ink-700">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
