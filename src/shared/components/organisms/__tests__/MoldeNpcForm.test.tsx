import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))

import { MoldeNpcForm } from '@/shared/components/organisms/MoldeNpcForm'

const INICIAL = {
  monstroSlug: 'goblin-minion',
  nome: 'Goblin Minion',
  hpMax: 7,
  armorClass: 12,
  initiativeMod: 2,
}

describe('MoldeNpcForm', () => {
  it('deve enviar os valores editados e o slug do monstro de origem', async () => {
    const acao = vi.fn().mockResolvedValue({ ok: true, id: 'm-1' })
    render(<MoldeNpcForm inicial={INICIAL} acao={acao} />)
    const usuario = userEvent.setup()

    await usuario.clear(screen.getByLabelText('PV máximo'))
    await usuario.type(screen.getByLabelText('PV máximo'), '20')
    await usuario.click(screen.getByRole('button', { name: 'Salvar molde' }))

    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1))
    const formData = acao.mock.calls[0]?.[1] as FormData
    expect(formData.get('hpMax')).toBe('20')
    expect(formData.get('monstroSlug')).toBe('goblin-minion')
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/npcs'))
  })

  it('deve mostrar o erro devolvido pela action e não navegar', async () => {
    pushMock.mockClear()
    const acao = vi.fn().mockResolvedValue({ erro: 'Molde inválido.' })
    render(<MoldeNpcForm inicial={{ ...INICIAL, monstroSlug: undefined }} acao={acao} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar molde' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Molde inválido.')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
