import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FichaAcoes } from '@/shared/components/organisms/FichaAcoes'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

// Dublês das Server Actions: resolvem o estado que a UI renderiza.
function acaoQueResolve(estado: EstadoAcao): AcaoFormulario {
  return vi.fn().mockResolvedValue(estado)
}

type PropsFicha = Parameters<typeof FichaAcoes>[0]

function propsFicha(alteracoes: Partial<PropsFicha> = {}): PropsFicha {
  return {
    id: 'p-1',
    nome: 'Bree',
    nivel: 3,
    visivel: true,
    acaoEditar: acaoQueResolve({ ok: true }),
    acaoAlternarVisibilidade: acaoQueResolve({ ok: true }),
    ...alteracoes,
  }
}

describe('FichaAcoes — edição', () => {
  it('deve editar nome e nível no mesmo submit, com id oculto', async () => {
    const acaoEditar = vi.fn().mockResolvedValue({ ok: true })
    render(<FichaAcoes {...propsFicha({ acaoEditar })} />)
    const usuario = userEvent.setup()

    await usuario.clear(screen.getByLabelText('Nome'))
    await usuario.type(screen.getByLabelText('Nome'), 'Bree II')
    await usuario.clear(screen.getByLabelText('Nível'))
    await usuario.type(screen.getByLabelText('Nível'), '4')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(acaoEditar).toHaveBeenCalledTimes(1))
    const formData = acaoEditar.mock.calls[0]?.[1] as FormData
    expect(formData.get('id')).toBe('p-1')
    expect(formData.get('nome')).toBe('Bree II')
    expect(formData.get('nivel')).toBe('4')
  })

  it('deve mostrar o erro da action como alerta legível', async () => {
    render(
      <FichaAcoes
        {...propsFicha({ acaoEditar: vi.fn().mockResolvedValue({ erro: 'Edição inválida.' }) })}
      />,
    )
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Edição inválida.')
  })
})

describe('FichaAcoes — privacidade', () => {
  it('deve alternar o rótulo do toggle conforme a visibilidade e enviar o id', async () => {
    const acaoToggle = vi.fn().mockResolvedValue({ ok: true })
    const { rerender } = render(
      <FichaAcoes {...propsFicha({ acaoAlternarVisibilidade: acaoToggle })} />,
    )

    expect(screen.getByRole('button', { name: 'Fechar ficha ao mestre' })).toBeInTheDocument()

    rerender(
      <FichaAcoes {...propsFicha({ visivel: false, acaoAlternarVisibilidade: acaoToggle })} />,
    )
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Abrir ficha ao mestre' }))

    await waitFor(() => expect(acaoToggle).toHaveBeenCalledTimes(1))
    const formData = acaoToggle.mock.calls[0]?.[1] as FormData
    expect(formData.get('id')).toBe('p-1')
  })
})
