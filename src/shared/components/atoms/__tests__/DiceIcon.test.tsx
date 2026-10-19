import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DiceIcon } from '@/shared/components/atoms/DiceIcon'

describe('DiceIcon', () => {
  it('deve se anunciar como imagem com o rótulo do dado', () => {
    render(<DiceIcon lados={20} />)
    expect(screen.getByRole('img', { name: 'd20' })).toBeInTheDocument()
  })

  it('deve distinguir o d4 do d6 pelo rótulo', () => {
    const { container } = render(
      <>
        <DiceIcon lados={4} />
        <DiceIcon lados={6} />
      </>,
    )
    expect(screen.getByRole('img', { name: 'd4' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'd6' })).toBeInTheDocument()
    // caminhos diferentes = silhuetas diferentes na mesa (1 path por dado simples)
    const caminhos = container.querySelectorAll('path')
    expect(caminhos[0].getAttribute('d')).not.toBe(caminhos[1].getAttribute('d'))
  })
})
