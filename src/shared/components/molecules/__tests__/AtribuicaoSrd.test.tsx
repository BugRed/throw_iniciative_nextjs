import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AtribuicaoSrd } from '@/shared/components/molecules/AtribuicaoSrd'

describe('AtribuicaoSrd', () => {
  it('credita o SRD 5.2 à Wizards of the Coast com a licença CC-BY 4.0', () => {
    render(<AtribuicaoSrd />)

    const texto = screen.getByText(/System Reference Document 5\.2/u)
    expect(texto).toHaveTextContent('Wizards of the Coast')
    expect(texto).toHaveTextContent('CC-BY 4.0')
  })

  it('aponta a fonte dos dados (5e-bits/5e-database)', () => {
    render(<AtribuicaoSrd />)

    expect(screen.getByText(/5e-bits\/5e-database/u)).toBeInTheDocument()
  })
})
