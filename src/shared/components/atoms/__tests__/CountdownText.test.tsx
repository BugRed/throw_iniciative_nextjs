import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CountdownText } from '@/shared/components/atoms/CountdownText'

describe('CountdownText', () => {
  describe('quando acima do limite de alerta', () => {
    it('deve formatar minutos e segundos com zero à esquerda', () => {
      render(<CountdownText segundosRestantes={125} />)
      expect(screen.getByText('02:05')).toBeInTheDocument()
      expect(screen.getByText('02:05')).not.toHaveAttribute('data-alerta', 'true')
    })
  })

  describe('quando no limite de alerta ou abaixo', () => {
    it('deve marcar alerta exatamente no limite (30s)', () => {
      render(<CountdownText segundosRestantes={30} />)
      expect(screen.getByText('00:30')).toHaveAttribute('data-alerta', 'true')
    })

    it('deve aceitar limite customizado', () => {
      render(<CountdownText segundosRestantes={45} limiteAlerta={60} />)
      expect(screen.getByText('00:45')).toHaveAttribute('data-alerta', 'true')
    })
  })

  describe('quando o tempo é negativo ou quebrado', () => {
    it('deve truncar em 00:00 e não exibir tempo negativo', () => {
      render(<CountdownText segundosRestantes={-7} />)
      expect(screen.getByText('00:00')).toBeInTheDocument()
    })

    it('deve descartar frações de segundo', () => {
      render(<CountdownText segundosRestantes={9.7} />)
      expect(screen.getByText('00:09')).toBeInTheDocument()
    })
  })
})
