// Indicador de progresso do wizard — mostra os steps cumpridos, o atual e os
// que faltam, com rótulo curto.

type Etapa = { titulo: string; curta: string }

export function StepIndicator({
  etapas,
  atual,
  onPular,
}: {
  etapas: Etapa[]
  atual: number
  onPular?: (indice: number) => void
}) {
  return (
    <ol
      className="flex flex-wrap items-center gap-1 font-sans text-xs"
      aria-label="Progresso do wizard"
    >
      {etapas.map((etapa, indice) => {
        const estado = indice < atual ? 'feito' : indice === atual ? 'atual' : 'futuro'
        const clicavel = Boolean(onPular) && indice < atual
        return (
          <li key={etapa.curta} className="flex items-center gap-1">
            {indice > 0 && (
              <span aria-hidden className="text-ink-300">
                ›
              </span>
            )}
            <button
              type="button"
              disabled={!clicavel}
              onClick={() => onPular?.(indice)}
              aria-current={estado === 'atual' ? 'step' : undefined}
              className={
                estado === 'atual'
                  ? 'rounded-md border border-gold-400 bg-gold-100 px-2 py-1 font-semibold text-ink-900'
                  : estado === 'feito'
                    ? 'rounded-md border border-moss-500 px-2 py-1 text-moss-600'
                    : 'rounded-md border border-paper-300 px-2 py-1 text-ink-400'
              }
            >
              {estado === 'feito' ? '✓ ' : ''}
              {etapa.curta}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
