import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge } from '@/shared/components/atoms/Badge'
import { Card } from '@/shared/components/atoms/Card'
import { StatPill } from '@/shared/components/atoms/StatPill'
import { OrnamentDivider } from '@/shared/components/molecules/OrnamentDivider'

describe('átomos de exibição', () => {
  describe('Badge', () => {
    it('deve renderizar o conteúdo com aparência de selo', () => {
      render(<Badge variante="gold">MESTRE</Badge>)
      expect(screen.getByText('MESTRE')).toBeInTheDocument()
    })
  })

  describe('Card', () => {
    it('deve renderizar título e conteúdo', () => {
      render(<Card titulo="Lobo">HP 11 · AC 13</Card>)
      expect(screen.getByRole('heading', { name: 'Lobo' })).toBeInTheDocument()
      expect(screen.getByText('HP 11 · AC 13')).toBeInTheDocument()
    })
  })

  describe('StatPill', () => {
    it('deve exibir rótulo e valor juntos', () => {
      render(<StatPill rotulo="Iniciativa" valor="+3" />)
      expect(screen.getByText('Iniciativa')).toBeInTheDocument()
      expect(screen.getByText('+3')).toBeInTheDocument()
    })
  })

  describe('OrnamentDivider', () => {
    it('deve se anunciar como separador', () => {
      render(<OrnamentDivider />)
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })
})
