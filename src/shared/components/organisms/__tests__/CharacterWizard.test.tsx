import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import type { DadosWizard } from '@/shared/components/organisms/character-wizard-tipos'
import { CharacterWizard } from '@/shared/components/organisms/CharacterWizard'

// Um form acumulado: o estado sobrevive à navegação entre os 10 steps.

const DADOS: DadosWizard = {
  especies: [
    { slug: 'human', name: 'Human' },
    { slug: 'elf', name: 'Elf' },
  ],
  classes: [
    {
      slug: 'fighter',
      name: 'Fighter',
      hitDie: 10,
      caster: false,
      pericias: {
        escolher: 2,
        opcoes: [
          { slug: 'athletics', name: 'Athletics' },
          { slug: 'acrobatics', name: 'Acrobatics' },
        ],
      },
    },
    {
      slug: 'wizard',
      name: 'Wizard',
      hitDie: 6,
      caster: true,
      pericias: { escolher: 2, opcoes: [{ slug: 'arcana', name: 'Arcana' }] },
    },
  ],
  subclasses: [{ slug: 'champion', name: 'Champion', classeSlug: 'fighter' }],
  backgrounds: [{ slug: 'soldier', name: 'Soldier' }],
  magiasNivel1: [{ slug: 'fire-bolt', name: 'Fire Bolt', extra: 'truque' }],
  equipamentos: [{ slug: 'longsword', name: 'Longsword' }],
}

const ACAO_CRIAR = vi.fn()

function valorOculto(campo: string) {
  const campoOculto = document.querySelector(`input[name="${campo}"]`) as HTMLInputElement | null
  return campoOculto?.value ?? ''
}

async function aumentarAtributo(
  usuario: ReturnType<typeof userEvent.setup>,
  rotulo: string,
  vezes: number,
) {
  for (let clique = 0; clique < vezes; clique++)
    await usuario.click(screen.getByRole('button', { name: `Aumentar ${rotulo}` }))
}

async function avancarAteRevisao(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByLabelText('Human'))
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  await usuario.click(screen.getByLabelText(/Fighter/u))
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  // Subclasse é informativa no nível 1.
  expect(screen.getByText(/Champion/u)).toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  await usuario.click(screen.getByLabelText('Soldier'))
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  // Atributos: distribui 15/14/12 (custo 20, dentro dos 27).
  await aumentarAtributo(usuario, 'Força', 7)
  await aumentarAtributo(usuario, 'Destreza', 6)
  await aumentarAtributo(usuario, 'Constituição', 4)
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  await usuario.click(screen.getByLabelText('Athletics'))
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  // Fighter não conjura.
  expect(screen.getByText('Sua classe não conjura magias no nível 1.')).toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  await usuario.click(screen.getByLabelText('Longsword'))
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  // Feats no nível 1: só texto informativo.
  await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

  await usuario.type(screen.getByLabelText('Nome do personagem'), 'Bree')
}

describe('CharacterWizard — navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ACAO_CRIAR.mockResolvedValue({ ok: true, id: 'p-1' })
  })

  it('deve navegar os 10 steps sem perder o estado acumulado', async () => {
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    await avancarAteRevisao(usuario)

    expect(screen.getByText('Revisão e nome', { selector: 'legend' })).toBeInTheDocument()
    expect(valorOculto('especie')).toBe('human')
    expect(valorOculto('classe')).toBe('fighter')
    expect(valorOculto('background')).toBe('soldier')
    expect(valorOculto('forca')).toBe('15')
    expect(valorOculto('destreza')).toBe('14')
    expect(valorOculto('constituicao')).toBe('12')
    expect(valorOculto('pericias')).toBe('athletics')
    expect(valorOculto('equipamento')).toBe('longsword')
    expect(valorOculto('nome')).toBe('Bree')
    expect(screen.getByText('Human')).toBeInTheDocument()
    expect(screen.getByText('Fighter (d10)')).toBeInTheDocument()
  })

  it('deve desabilitar Voltar na primeira etapa e manter a escolha ao voltar', async () => {
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()

    await usuario.click(screen.getByLabelText('Human'))
    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))
    await usuario.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByText('Espécie', { selector: 'legend' })).toBeInTheDocument()
    expect(screen.getByLabelText('Human')).toBeChecked()
  })
})

describe('CharacterWizard — validação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ACAO_CRIAR.mockResolvedValue({ ok: true, id: 'p-1' })
  })

  it('deve bloquear o avanço sem espécie escolhida', async () => {
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma espécie.')
    expect(screen.getByText('Espécie', { selector: 'legend' })).toBeInTheDocument()
  })

  it('deve bloquear o avanço quando o point buy passa de 27', async () => {
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    await usuario.click(screen.getByLabelText('Human'))
    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))
    await usuario.click(screen.getByLabelText(/Fighter/u))
    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))
    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))
    await usuario.click(screen.getByLabelText('Soldier'))
    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

    // 15/15/15 = 27; um ponto a mais em qualquer atributo estoura.
    await aumentarAtributo(usuario, 'Força', 7)
    await aumentarAtributo(usuario, 'Destreza', 7)
    await aumentarAtributo(usuario, 'Constituição', 7)
    await usuario.click(screen.getByRole('button', { name: 'Aumentar Inteligência' }))

    await usuario.click(screen.getByRole('button', { name: 'Avançar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Distribua no máximo 27 pontos.')
  })
})

describe('CharacterWizard — submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ACAO_CRIAR.mockResolvedValue({ ok: true, id: 'p-1' })
  })

  it('deve submeter tudo no fim e redirecionar para a ficha criada', async () => {
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    await avancarAteRevisao(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Criar ficha' }))

    await waitFor(() => expect(ACAO_CRIAR).toHaveBeenCalledTimes(1))
    const formData = ACAO_CRIAR.mock.calls[0]?.[1] as FormData
    expect(formData.get('especie')).toBe('human')
    expect(formData.get('classe')).toBe('fighter')
    expect(formData.get('forca')).toBe('15')
    expect(formData.get('nome')).toBe('Bree')
    expect(formData.get('visivelAoMestre')).toBe('on')

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/characters/p-1'))
  })

  it('deve mostrar erro devolvido pela action sem perder o formulário', async () => {
    ACAO_CRIAR.mockResolvedValue({ erro: 'Classe não existe no SRD.' })
    const usuario = userEvent.setup()
    render(<CharacterWizard dados={DADOS} acao={ACAO_CRIAR} />)

    await avancarAteRevisao(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Criar ficha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Classe não existe no SRD.')
    expect(valorOculto('nome')).toBe('Bree')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
