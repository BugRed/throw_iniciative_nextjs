export function CountdownText({
  segundosRestantes,
  limiteAlerta = 30,
  className = '',
}: {
  segundosRestantes: number
  limiteAlerta?: number
  className?: string
}) {
  const clampado = Math.max(0, Math.floor(segundosRestantes))
  const minutos = String(Math.floor(clampado / 60)).padStart(2, '0')
  const segundos = String(clampado % 60).padStart(2, '0')
  const emAlerta = clampado <= limiteAlerta

  return (
    <span
      data-alerta={emAlerta ? 'true' : undefined}
      className={`font-mono text-lg font-semibold tabular-nums ${emAlerta ? 'text-fire-600' : 'text-ink-900'} ${className}`}
    >
      {minutos}:{segundos}
    </span>
  )
}
