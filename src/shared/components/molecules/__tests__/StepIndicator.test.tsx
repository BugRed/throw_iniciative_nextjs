import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StepIndicator } from '@/shared/components/molecules/StepIndicator'

const ETAPAS = [
  { titulo: 'Espécie', curta: 'Espécie' },
  { titulo: 'Classe', curta: 'Classe' },
  { titulo: 'Revisão', curta: 'Revisão' },
]

describe('StepIndicator', () => {
  it('deve marcar a etapa atual com aria-current=step', () => {
    render(<StepIndicator etapas={ETAPAS} atual={1} />)

    expect(screen.getByRole('button', { name: 'Classe' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /Espécie/u })).not.toHaveAttribute('aria-current')
  })

  it('deve sinalizar etapas cumpridas com check e permitir voltar a elas', async () => {
    const onPular = vi.fn()
    render(<StepIndicator etapas={ETAPAS} atual={2} onPular={onPular} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: /Espécie/ }))

    expect(onPular).toHaveBeenCalledWith(0)
  })

  it('deve desabilitar etapas futuras e a atual', () => {
    render(<StepIndicator etapas={ETAPAS} atual={1} onPular={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Revisão' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Classe' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Espécie/ })).toBeEnabled()
  })

  it('deve desabilitar tudo quando não há onPular', () => {
    render(<StepIndicator etapas={ETAPAS} atual={1} />)

    expect(
      screen.getAllByRole('button').every((botao) => (botao as HTMLButtonElement).disabled),
    ).toBe(true)
  })
})
