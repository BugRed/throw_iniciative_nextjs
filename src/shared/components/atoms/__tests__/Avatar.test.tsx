import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from '@/shared/components/atoms/Avatar'

describe('Avatar', () => {
  describe('quando sem imagem', () => {
    it('deve exibir as iniciais do nome completo', () => {
      render(<Avatar nome="Gabriel Alves" />)
      expect(screen.getByTitle('Gabriel Alves')).toHaveTextContent('GA')
    })

    it('deve exibir só a inicial quando o nome é único', () => {
      render(<Avatar nome="Saruman" />)
      expect(screen.getByTitle('Saruman')).toHaveTextContent('S')
    })

    it('deve ficar vazio quando o nome é vazio', () => {
      const { container } = render(<Avatar nome="   " />)
      expect(container.querySelector('span')).toHaveTextContent('')
    })
  })

  describe('quando com imagem', () => {
    it('deve renderizar img acessível pelo nome', () => {
      render(<Avatar nome="Gabriel Alves" src="https://exemplo.test/a.png" />)
      expect(screen.getByRole('img', { name: 'Gabriel Alves' })).toHaveAttribute(
        'src',
        'https://exemplo.test/a.png',
      )
    })
  })
})
