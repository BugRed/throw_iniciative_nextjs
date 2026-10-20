import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  EtapaAtributos,
  EtapaEscolha,
  EtapaInfo,
  EtapaMultipla,
  EtapaRevisao,
} from '@/shared/components/organisms/etapas-wizard'

// Etapas presentacionais: recebem estado e callbacks por prop.

const TODOS_8 = {
  forca: 8,
  destreza: 8,
  constituicao: 8,
  inteligencia: 8,
  sabedoria: 8,
  carisma: 8,
}

function atributosCom(alteracoes: Partial<typeof TODOS_8>) {
  return { ...TODOS_8, ...alteracoes }
}

describe('EtapaEscolha', () => {
  it('deve notificar a escolha com o slug da opção', async () => {
    const onChange = vi.fn()
    render(
      <EtapaEscolha
        titulo="Espécie"
        opcoes={[
          { slug: 'human', name: 'Human' },
          { slug: 'elf', name: 'Elf' },
        ]}
        valor=""
        onChange={onChange}
      />,
    )
    const usuario = userEvent.setup()

    await usuario.click(screen.getByLabelText('Human'))

    expect(onChange).toHaveBeenCalledWith('human')
  })

  it('deve marcar a opção que corresponde ao valor atual', () => {
    render(
      <EtapaEscolha
        titulo="Classe"
        opcoes={[
          { slug: 'fighter', name: 'Fighter', extra: 'd10' },
          { slug: 'wizard', name: 'Wizard', extra: 'd6' },
        ]}
        valor="wizard"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Wizard/u)).toBeChecked()
    expect(screen.getByLabelText(/Fighter/u)).not.toBeChecked()
  })
})

describe('EtapaAtributos', () => {
  it('deve exibir o gasto corrente do point buy sem aviso dentro do limite', () => {
    render(
      <EtapaAtributos valores={atributosCom({ forca: 15, constituicao: 14 })} onChange={vi.fn()} />,
    )

    expect(screen.getByText(/Pontos gastos: 16 \/ 27/u)).toBeInTheDocument()
    expect(screen.queryByText(/passa do limite/u)).not.toBeInTheDocument()
  })

  it('deve avisar quando o gasto passa de 27', () => {
    render(
      <EtapaAtributos
        valores={atributosCom({ forca: 15, destreza: 15, constituicao: 15, inteligencia: 9 })}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/Pontos gastos: 28 \/ 27/u)).toBeInTheDocument()
    expect(screen.getByText(/passa do limite/u)).toBeInTheDocument()
  })

  it('deve chamar onChange com atributo e delta nos botões +/−', async () => {
    const onChange = vi.fn()
    render(<EtapaAtributos valores={atributosCom({})} onChange={onChange} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Aumentar Força' }))
    await usuario.click(screen.getByRole('button', { name: 'Diminuir Destreza' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 'forca', 1)
    expect(onChange).toHaveBeenNthCalledWith(2, 'destreza', -1)
  })
})

describe('EtapaMultipla', () => {
  const OPCOES = [
    { slug: 'athletics', name: 'Athletics' },
    { slug: 'acrobatics', name: 'Acrobatics' },
    { slug: 'stealth', name: 'Stealth' },
  ]

  it('deve alternar seleção e manter contador do máximo', async () => {
    const onToggle = vi.fn()
    render(
      <EtapaMultipla
        titulo="Perícias"
        opcoes={OPCOES}
        selecionados={['athletics']}
        onToggle={onToggle}
        maximo={2}
      />,
    )
    const usuario = userEvent.setup()

    expect(screen.getByText('1 / 2 escolhidos')).toBeInTheDocument()
    await usuario.click(screen.getByLabelText('Acrobatics'))

    expect(onToggle).toHaveBeenCalledWith('acrobatics')
  })

  it('deve bloquear novas escolhas no limite sem travar a desseleção', () => {
    render(
      <EtapaMultipla
        titulo="Perícias"
        opcoes={OPCOES}
        selecionados={['athletics', 'acrobatics']}
        onToggle={vi.fn()}
        maximo={2}
      />,
    )

    expect(screen.getByLabelText('Stealth')).toBeDisabled()
    expect(screen.getByLabelText('Athletics')).toBeEnabled()
  })
})

describe('EtapaInfo e EtapaRevisao', () => {
  it('deve exibir parágrafos e itens informativos', () => {
    render(
      <EtapaInfo
        titulo="Subclasse"
        paragrafos={['A escolha vem no nível 3.']}
        itens={[{ slug: 'champion', name: 'Champion' }]}
      />,
    )

    expect(screen.getByText('A escolha vem no nível 3.')).toBeInTheDocument()
    expect(screen.getByText(/Champion/u)).toBeInTheDocument()
  })

  it('deve digitar o nome e alternar a privacidade', async () => {
    // A etapa é controlada: sem estado no pai, o input resetaria a cada tecla.
    const onVisivel = vi.fn()
    function RevisaoComEstado() {
      const [nome, setNome] = useState('')
      return (
        <EtapaRevisao
          nome={nome}
          onNome={setNome}
          visivel
          onVisivel={onVisivel}
          resumo={[['Classe', 'Fighter (d10)']]}
        />
      )
    }
    render(<RevisaoComEstado />)
    const usuario = userEvent.setup()

    await usuario.type(screen.getByLabelText('Nome do personagem'), 'Bree')

    expect((screen.getByLabelText('Nome do personagem') as HTMLInputElement).value).toBe('Bree')

    await usuario.click(screen.getByLabelText('Mestre pode ver a ficha completa'))

    expect(onVisivel).toHaveBeenCalledWith(false)
    expect(screen.getByText('Fighter (d10)')).toBeInTheDocument()
  })
})
