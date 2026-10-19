import type { ComponentProps } from 'react'

const classeCampo =
  'rounded-md border border-ink-900/25 bg-paper-50 px-3 py-2 font-sans text-sm text-ink-900 placeholder:text-ink-500/60 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 aria-invalid:border-fire-500'

export type TextareaProps = ComponentProps<'textarea'> & {
  rotulo?: string
  erro?: string
}

export function Textarea({ rotulo, erro, id, className = '', ...props }: TextareaProps) {
  const campoId = id ?? props.name

  return (
    <div className="flex flex-col gap-1">
      {rotulo ? (
        <label htmlFor={campoId} className="font-sans text-sm font-medium text-ink-700">
          {rotulo}
        </label>
      ) : null}
      <textarea
        id={campoId}
        aria-invalid={erro ? true : undefined}
        className={`${classeCampo} ${className}`}
        {...props}
      />
      {erro ? (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
