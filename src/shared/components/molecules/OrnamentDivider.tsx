// Divisor ornamental da linguagem do site de referência: filete duplo em ouro
// com losango central — marca a passagem entre seções do pergaminho.
export function OrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`flex items-center gap-3 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/70" />
      <span aria-hidden="true" className="size-1.5 rotate-45 bg-gold-500" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/70" />
    </div>
  )
}
