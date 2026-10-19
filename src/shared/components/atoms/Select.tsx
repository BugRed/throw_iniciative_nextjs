import type { ComponentProps } from 'react'

export type OpcaoSelect = { valor: string; rotulo: string }

const classeCampo =
  'rounded-md border border-ink-900/25 bg-paper-50 px-3 py-2 font-sans text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

export type SelectProps = Omit<ComponentProps<'select'>, 'children'> & {
  rotulo?: string
  opcoes: OpcaoSelect[]
}

export function Select({ rotulo, opcoes, id, className = '', ...props }: SelectProps) {
  const campoId = id ?? props.name

  return (
    <div className="flex flex-col gap-1">
      {rotulo ? (
        <label htmlFor={campoId} className="font-sans text-sm font-medium text-ink-700">
          {rotulo}
        </label>
      ) : null}
      <select id={campoId} className={`${classeCampo} ${className}`} {...props}>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}
