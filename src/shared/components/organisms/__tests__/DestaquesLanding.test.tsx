import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DestaquesLanding } from '@/shared/components/organisms/DestaquesLanding'

describe('DestaquesLanding', () => {
  it('mostra os três pilares do produto', () => {
    render(<DestaquesLanding />)

    expect(screen.getByText('Fila em tempo real')).toBeInTheDocument()
    expect(screen.getByText('Dado d20 do servidor')).toBeInTheDocument()
    expect(screen.getByText('Timer com passe automático')).toBeInTheDocument()
  })
})
