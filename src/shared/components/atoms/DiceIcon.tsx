export type DiceSides = 4 | 6 | 8 | 10 | 12 | 20

// Silhuetas simples e reconhecíveis por número de lados — o d20 ganha o triângulo
// interno, que é o que o distingue do d10 à primeira vista na mesa.
const formas: Record<DiceSides, string> = {
  4: 'M12 3 L22 20 L2 20 Z',
  6: 'M4.5 4.5 H19.5 V19.5 H4.5 Z',
  8: 'M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z',
  10: 'M12 2.5 L21 9.5 L17.5 20 H6.5 L3 9.5 Z',
  12: 'M12 2.5 L21 8.5 L17.5 19.5 H6.5 L3 8.5 Z',
  20: 'M12 2.5 L21.5 9 L18 20 H6 L2.5 9 Z',
}

export function DiceIcon({ lados, className = '' }: { lados: DiceSides; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={`d${lados}`}
      className={`fill-current ${className}`}
    >
      <title>{`d${lados}`}</title>
      <path d={formas[lados]} />
      {lados === 20 ? (
        <path d="M12 7.5 L17 16 H7 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      ) : null}
    </svg>
  )
}
