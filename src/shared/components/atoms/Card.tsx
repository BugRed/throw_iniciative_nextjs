import type { ReactNode } from 'react'

export function Card({
  titulo,
  children,
  className = '',
}: {
  titulo?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={`rounded-lg border border-gold-500/50 bg-paper-50 p-6 shadow-sm ${className}`}
    >
      {titulo ? (
        <h3 className="mb-2 font-serif text-lg font-semibold text-wine-500">{titulo}</h3>
      ) : null}
      {children}
    </article>
  )
}
