import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signUpEmailMock } = vi.hoisted(() => ({ signUpEmailMock: vi.fn() }))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: (...args: unknown[]) => signUpEmailMock(...args),
    },
  },
}))

import { FormularioRegistro } from '@/app/(auth)/register/formulario'

async function preencherRegistro(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Aria')
  await user.type(screen.getByLabelText('E-mail'), 'aria@teste.dev')
  await user.type(screen.getByLabelText(/senha/i), 'senha-segura')
}

describe('Formulário de registro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve oferecer nome, e-mail e senha', () => {
    render(<FormularioRegistro ambienteDev />)
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  describe('quando a conta é criada', () => {
    it('deve pedir confirmação de e-mail e apontar a caixa de entrada em dev', async () => {
      signUpEmailMock.mockResolvedValue({ error: null })
      const user = userEvent.setup()

      render(<FormularioRegistro ambienteDev />)
      await preencherRegistro(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(signUpEmailMock).toHaveBeenCalledWith({
        name: 'Aria',
        email: 'aria@teste.dev',
        password: 'senha-segura',
      })
      expect(await screen.findByText(/Conta criada!/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '/dev/caixa-de-entrada' })).toHaveAttribute(
        'href',
        '/dev/caixa-de-entrada',
      )
    })

    it('deve omitir o atalho de dev fora do ambiente de desenvolvimento', async () => {
      signUpEmailMock.mockResolvedValue({ error: null })
      const user = userEvent.setup()

      render(<FormularioRegistro ambienteDev={false} />)
      await preencherRegistro(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(await screen.findByText(/Conta criada!/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: '/dev/caixa-de-entrada' })).not.toBeInTheDocument()
    })
  })

  describe('quando o registro é recusado', () => {
    it('deve exibir o motivo sem trocar de tela', async () => {
      signUpEmailMock.mockResolvedValue({ error: { message: 'Usuário já existe' } })
      const user = userEvent.setup()

      render(<FormularioRegistro ambienteDev />)
      await preencherRegistro(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Usuário já existe')
      expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
    })
  })
})
