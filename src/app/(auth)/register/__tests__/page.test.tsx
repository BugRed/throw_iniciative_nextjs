import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import RegisterPage from '@/app/(auth)/register/page'

describe('Página de registro', () => {
  it('deve renderizar o formulário de criação de conta', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
  })
})
