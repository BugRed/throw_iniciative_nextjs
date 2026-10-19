import Link from 'next/link'
import type { ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantes: Record<ButtonVariant, string> = {
  primary: 'bg-wine-500 text-paper-50 hover:bg-wine-600',
  secondary: 'border border-ink-900/30 bg-paper-50 text-ink-900 hover:bg-paper-200',
  ghost: 'text-wine-500 hover:bg-paper-200',
  danger: 'bg-fire-500 text-paper-50 hover:bg-fire-600',
  // CTA dourado para superfícies de couro escuro (hero, tracker)
  gold: 'bg-gold-400 text-leather-800 hover:bg-gold-500',
}

const tamanhos: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const classeBase =
  'inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-700 disabled:pointer-events-none disabled:opacity-50'

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `${classeBase} ${variantes[variant]} ${tamanhos[size]} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
