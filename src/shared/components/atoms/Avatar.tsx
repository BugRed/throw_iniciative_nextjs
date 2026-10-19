import type { ReactNode } from 'react'

export type AvatarSize = 'sm' | 'md' | 'lg'

const tamanhos: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : ''
  return `${primeira}${ultima}`.toUpperCase()
}

export function Avatar({
  nome,
  src,
  tamanho = 'md',
}: {
  nome: string
  src?: string
  tamanho?: AvatarSize
}): ReactNode {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar vira de URL externa/S3, não do pipeline de otimização
      <img
        src={src}
        alt={nome}
        className={`rounded-full border border-gold-500/50 object-cover ${tamanhos[tamanho]}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      title={nome}
      className={`flex items-center justify-center rounded-full border border-gold-500/50 bg-leather-700 font-display text-gold-300 ${tamanhos[tamanho]}`}
    >
      {iniciais(nome)}
    </span>
  )
}
