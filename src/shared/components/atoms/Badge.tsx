import type { ReactNode } from 'react'

export type BadgeVariant = 'wine' | 'gold' | 'moss' | 'fire' | 'ash' | 'outline'

const variantes: Record<BadgeVariant, string> = {
  wine: 'border-wine-500/30 bg-wine-500/10 text-wine-500',
  gold: 'border-gold-500/40 bg-gold-500/15 text-gold-800',
  moss: 'border-moss-600/30 bg-moss-600/10 text-moss-600',
  fire: 'border-fire-500/30 bg-fire-500/10 text-fire-600',
  ash: 'border-ash-400/40 bg-ash-400/15 text-ink-500',
  outline: 'border-ink-900/25 bg-transparent text-ink-700',
}

export function Badge({
  variante = 'wine',
  children,
}: {
  variante?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-xs font-medium ${variantes[variante]}`}
    >
      {children}
    </span>
  )
}
