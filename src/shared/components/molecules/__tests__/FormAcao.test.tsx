import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormAcao } from '@/shared/components/molecules/FormAcao'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FormAcao', () => {
  it('deve enviar os campos fixos e os campos editáveis para a action', async () => {
    const acao = vi.fn().mockResolvedValue({ ok: true })
    render(
      <FormAcao acao={acao} rotulo="Salvar" campos={{ roomId: 'r-1' }}>
        <input aria-label="Quantidade" name="quantidade" defaultValue="3" />
      </FormAcao>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const formData = acao.mock.calls[0][1] as FormData
    expect(formData.get('roomId')).toBe('r-1')
    expect(formData.get('quantidade')).toBe('3')
  })

  it('deve mostrar o erro devolvido pela action', async () => {
    const acao = vi.fn().mockResolvedValue({ erro: 'A sala já tem 10 jogadores.' })
    render(<FormAcao acao={acao} rotulo="Aceitar" />)

    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A sala já tem 10 jogadores.')
  })

  it('não deve enviar quando o usuário não confirma a ação destrutiva', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const acao = vi.fn().mockResolvedValue({ ok: true })
    render(<FormAcao acao={acao} rotulo="Expulsar" confirmar="Expulsar Bia?" />)

    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }))

    expect(window.confirm).toHaveBeenCalledWith('Expulsar Bia?')
    expect(acao).not.toHaveBeenCalled()
  })

  it('deve enviar quando o usuário confirma', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const acao = vi.fn().mockResolvedValue({ ok: true })
    render(<FormAcao acao={acao} rotulo="Expulsar" confirmar="Expulsar Bia?" />)

    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }))

    expect(acao).toHaveBeenCalledTimes(1)
  })
})
