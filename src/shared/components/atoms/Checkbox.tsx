import type { ComponentProps } from 'react'

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  rotulo: string
}

export function Checkbox({ rotulo, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-ink-900">
      <input type="checkbox" className={`size-4 accent-wine-500 ${className}`} {...props} />
      {rotulo}
    </label>
  )
}
