import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MoldesNpc } from '@/shared/components/organisms/MoldesNpc'

const MOLDE = { id: 'm-1', name: 'Goblin forte', hpMax: 12, armorClass: 13, initiativeMod: -1 }

describe('MoldesNpc', () => {
  it('deve excluir o molde pelo id e mostrar iniciativa negativa sem sinal duplicado', async () => {
    const acao = vi.fn().mockResolvedValue({ ok: true })
    render(<MoldesNpc moldes={[MOLDE]} catalogo={[]} acaoExcluir={acao} />)

    expect(screen.getByText(/Init -1/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1))
    expect((acao.mock.calls[0]?.[1] as FormData).get('id')).toBe('m-1')
  })

  it('deve mostrar o erro da exclusão e ND vazio para monstro sem CR', async () => {
    const acao = vi.fn().mockResolvedValue({ erro: 'Molde de NPC não encontrado.' })
    render(
      <MoldesNpc
        moldes={[MOLDE]}
        catalogo={[{ slug: 'x', name: 'Misterioso', challengeRating: null }]}
        acaoExcluir={acao}
      />,
    )

    expect(screen.getByText('ND —')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Molde de NPC não encontrado.')
  })
})
