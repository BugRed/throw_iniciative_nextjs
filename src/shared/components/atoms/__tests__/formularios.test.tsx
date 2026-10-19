import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Checkbox } from '@/shared/components/atoms/Checkbox'
import { Input } from '@/shared/components/atoms/Input'
import { Select } from '@/shared/components/atoms/Select'
import { Textarea } from '@/shared/components/atoms/Textarea'

describe('átomos de formulário', () => {
  describe('Input', () => {
    it('deve associar rótulo ao campo pelo name quando id ausente', () => {
      render(<Input name="nome" rotulo="Nome do herói" />)
      expect(screen.getByLabelText('Nome do herói')).toHaveAttribute('name', 'nome')
    })

    it('deve anunciar erro com alerta e marcar o campo inválido', () => {
      render(<Input name="nome" rotulo="Nome" erro="Campo obrigatório" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
      expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Select', () => {
    it('deve listar as opções recebidas', () => {
      render(
        <Select
          name="classe"
          rotulo="Classe"
          opcoes={[
            { valor: 'fighter', rotulo: 'Fighter' },
            { valor: 'wizard', rotulo: 'Wizard' },
          ]}
        />,
      )
      expect(screen.getByLabelText('Classe')).toHaveValue('fighter')
      expect(screen.getByRole('option', { name: 'Wizard' })).toBeInTheDocument()
    })
  })

  describe('Textarea', () => {
    it('deve associar rótulo ao campo', () => {
      render(<Textarea name="biografia" rotulo="Biografia" />)
      expect(screen.getByLabelText('Biografia')).toBeInTheDocument()
    })
  })

  describe('Checkbox', () => {
    it('deve tornar o rótulo clicável e o campo marcável', () => {
      render(<Checkbox name="aceite" rotulo="Ficha visível ao mestre" />)
      const campo = screen.getByLabelText('Ficha visível ao mestre')
      expect(campo).not.toBeChecked()
    })
  })
})
