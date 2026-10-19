import type { ReactNode } from 'react'

export function StatPill({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-gold-500/40 bg-paper-200/60 px-2.5 py-1">
      <span className="font-sans text-xs uppercase tracking-wide text-ink-500">{rotulo}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-ink-900">{valor}</span>
    </span>
  )
}
