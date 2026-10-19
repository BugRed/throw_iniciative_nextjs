import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, refreshMock, signInEmailMock, signInSocialMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signInSocialMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => signInEmailMock(...args),
      social: (...args: unknown[]) => signInSocialMock(...args),
    },
  },
}))

import { FormularioLogin } from '@/app/(auth)/login/formulario'

async function preencherCredenciais(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('E-mail'), 'aria@teste.dev')
  await user.type(screen.getByLabelText('Senha'), 'senha-segura')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('quando Discord não está configurado', () => {
  it('deve oferecer apenas o caminho por e-mail', () => {
    render(<FormularioLogin discordAtivo={false} />)
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /discord/i })).not.toBeInTheDocument()
  })
})

describe('quando Discord está configurado', () => {
  it('deve exibir o botão do Discord além do login por e-mail', () => {
    render(<FormularioLogin discordAtivo />)
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar com discord/i })).toBeInTheDocument()
  })

  it('deve iniciar o OAuth do Discord com retorno ao dashboard', async () => {
    signInSocialMock.mockResolvedValue({})
    const user = userEvent.setup()

    render(<FormularioLogin discordAtivo />)
    await user.click(screen.getByRole('button', { name: /entrar com discord/i }))

    expect(signInSocialMock).toHaveBeenCalledWith({
      provider: 'discord',
      callbackURL: '/dashboard',
    })
  })
})

describe('quando as credenciais são aceitas', () => {
  it('deve entrar e levar o usuário para o dashboard', async () => {
    signInEmailMock.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<FormularioLogin discordAtivo={false} />)
    await preencherCredenciais(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(signInEmailMock).toHaveBeenCalledWith({
      email: 'aria@teste.dev',
      password: 'senha-segura',
    })
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'))
    expect(refreshMock).toHaveBeenCalled()
  })
})

describe('quando as credenciais são recusadas', () => {
  it('deve apontar a caixa de entrada de dev quando o e-mail não está verificado', async () => {
    signInEmailMock.mockResolvedValue({ error: { message: "User's email is not verified" } })
    const user = userEvent.setup()

    render(<FormularioLogin discordAtivo={false} />)
    await preencherCredenciais(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/caixa-de-entrada/)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('deve exibir mensagem genérica para credencial inválida', async () => {
    signInEmailMock.mockResolvedValue({ error: { message: 'Invalid email or password' } })
    const user = userEvent.setup()

    render(<FormularioLogin discordAtivo={false} />)
    await preencherCredenciais(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
  })
})

describe('quando o usuário procura as saídas do formulário', () => {
  it('deve apontar para cadastro e redefinição', () => {
    render(<FormularioLogin discordAtivo={false} />)
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
