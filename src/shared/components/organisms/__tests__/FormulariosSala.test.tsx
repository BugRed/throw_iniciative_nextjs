import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { push, hook } = vi.hoisted(() => ({ push: vi.fn(), hook: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/shared/lib/use-room-events', () => ({ useRoomEvents: hook }))

import { EntrarSalaForm } from '@/shared/components/organisms/EntrarSalaForm'
import { NovaSalaForm } from '@/shared/components/organisms/NovaSalaForm'
import type { AcaoFormulario } from '@/shared/lib/estado-acao'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NovaSalaForm', () => {
  it('deve levar ao lobby da sala criada', async () => {
    const acao = vi.fn().mockResolvedValue({ ok: true, id: 'r-9' })
    render(<NovaSalaForm acao={acao} />)

    await userEvent.type(screen.getByLabelText('Nome da sala'), 'Mesa de sexta')
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }))

    expect((acao.mock.calls[0][1] as FormData).get('nome')).toBe('Mesa de sexta')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/rooms/r-9'))
  })

  it('deve mostrar o erro e ficar na página', async () => {
    const acao = vi.fn().mockResolvedValue({ erro: 'Você já tem 5 salas abertas.' })
    render(<NovaSalaForm acao={acao} />)

    await userEvent.type(screen.getByLabelText('Nome da sala'), 'Outra')
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já tem 5 salas abertas.')
    expect(push).not.toHaveBeenCalled()
  })
})

describe('EntrarSalaForm', () => {
  async function enviarPedido(acao: AcaoFormulario) {
    render(<EntrarSalaForm acao={acao} />)
    await userEvent.type(screen.getByLabelText('Código da sala'), 'ab2cd3')
    await userEvent.click(screen.getByRole('button', { name: 'Pedir para entrar' }))
  }

  it('deve mostrar "código inválido" sem avançar', async () => {
    await enviarPedido(vi.fn().mockResolvedValue({ erro: 'Código inválido.' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido.')
    expect(hook).not.toHaveBeenCalled()
  })

  it('deve aguardar o mestre e escutar o resultado do próprio pedido', async () => {
    await enviarPedido(vi.fn().mockResolvedValue({ ok: true, id: 'r-1' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/Aguarde o mestre/)
    expect(hook).toHaveBeenCalledWith('r-1', expect.any(Function))
  })

  it('deve entrar no lobby sozinho quando o mestre aceita', async () => {
    await enviarPedido(vi.fn().mockResolvedValue({ ok: true, id: 'r-1' }))
    await screen.findByRole('status')

    act(() => hook.mock.calls.at(-1)?.[1]('member:joined'))

    expect(push).toHaveBeenCalledWith('/rooms/r-1')
  })

  it('deve avisar quando o mestre recusa, sem entrar', async () => {
    await enviarPedido(vi.fn().mockResolvedValue({ ok: true, id: 'r-1' }))
    await screen.findByRole('status')

    act(() => hook.mock.calls.at(-1)?.[1]('member:rejected'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/recusou/)
    expect(push).not.toHaveBeenCalled()
  })

  it('deve ignorar eventos que não são o resultado do pedido', async () => {
    await enviarPedido(vi.fn().mockResolvedValue({ ok: true, id: 'r-1' }))
    await screen.findByRole('status')

    act(() => hook.mock.calls.at(-1)?.[1]('npc:added'))

    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
