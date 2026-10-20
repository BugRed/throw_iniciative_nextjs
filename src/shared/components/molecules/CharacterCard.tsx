import Link from 'next/link'

import { Badge } from '@/shared/components/atoms/Badge'

export type PersonagemCardDados = {
  id: string
  name: string
  level: number
  isNpc: boolean
  isVisibleToMaster: boolean
  hpMax: number
  armorClass: number
  initiativeMod: number
  species: { name: string } | null
  srdClass: { name: string }
}

export function CharacterCard({ personagem }: { personagem: PersonagemCardDados }) {
  return (
    <Link
      href={`/characters/${personagem.id}`}
      className="flex items-center justify-between gap-4 rounded-md border border-gold-200 bg-paper-50 px-5 py-4 transition-colors hover:border-gold-400"
    >
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg font-semibold text-ink-900">
          {personagem.name}
          {personagem.isNpc && (
            <span className="ml-2 align-middle">
              <Badge variante="gold">NPC</Badge>
            </span>
          )}
        </p>
        <p className="font-sans text-sm text-ink-500">
          {personagem.species?.name ?? '—'} · {personagem.srdClass.name} · Nível {personagem.level}
        </p>
      </div>
      <div className="flex gap-4 font-mono text-sm text-ink-700">
        <span title="Pontos de vida máximos">HP {personagem.hpMax}</span>
        <span title="Classe de armadura">CA {personagem.armorClass}</span>
        <span title="Modificador de iniciativa">
          INIT{' '}
          {personagem.initiativeMod >= 0
            ? `+${personagem.initiativeMod}`
            : personagem.initiativeMod}
        </span>
        {!personagem.isVisibleToMaster && <Badge variante="fire">Fechada</Badge>}
      </div>
    </Link>
  )
}
