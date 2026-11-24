import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { caminhoAtual } = vi.hoisted(() => ({ caminhoAtual: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => caminhoAtual(),
}))

import { NavegacaoApp } from '@/shared/components/molecules/NavegacaoApp'

describe('NavegacaoApp', () => {
  it('deve listar as seções do app autenticado', () => {
    caminhoAtual.mockReturnValue('/dashboard')

    render(<NavegacaoApp />)

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Personagens' })).toHaveAttribute('href', '/characters')
  })

  it('deve marcar com aria-current a seção da rota atual (prefixo conta)', () => {
    caminhoAtual.mockReturnValue('/characters/f98a1d1e')

    render(<NavegacaoApp />)

    expect(screen.getByRole('link', { name: 'Personagens' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })
})
