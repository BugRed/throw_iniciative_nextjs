import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/shared/components/atoms/Button'

describe('Button', () => {
  describe('quando sem href', () => {
    it('deve renderizar como botão', () => {
      render(<Button>Salvar</Button>)
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    })

    it('deve desabilitar com disabled', () => {
      render(<Button disabled>Rolar</Button>)
      expect(screen.getByRole('button', { name: 'Rolar' })).toBeDisabled()
    })
  })

  describe('quando com href', () => {
    it('deve virar link navegável', () => {
      render(<Button href="/login">Entrar</Button>)
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    })

    it('não deve renderizar botão junto', () => {
      render(<Button href="/login">Entrar</Button>)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
