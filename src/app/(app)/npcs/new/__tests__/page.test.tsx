import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock } = vi.hoisted(() => ({
  controllerMock: { controlarStatsMonstro: vi.fn() },
}))

vi.mock('@/server/npcs/npcs.controller', () => controllerMock)
vi.mock('@/app/(app)/npcs/actions', () => ({ acaoCriarMolde: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import NewNpcTemplatePage from '@/app/(app)/npcs/new/page'

describe('Novo molde de NPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve pré-preencher o formulário com os stats do monstro do SRD', async () => {
    controllerMock.controlarStatsMonstro.mockResolvedValue({
      slug: 'goblin-minion',
      nome: 'Goblin Minion',
      hpMax: 7,
      armorClass: 12,
      initiativeMod: 2,
    })

    render(
      await NewNpcTemplatePage({ searchParams: Promise.resolve({ monstro: 'goblin-minion' }) }),
    )

    expect(controllerMock.controlarStatsMonstro).toHaveBeenCalledWith('goblin-minion')
    expect(screen.getByLabelText('Nome')).toHaveValue('Goblin Minion')
    expect(screen.getByLabelText('PV máximo')).toHaveValue(7)
    expect(screen.getByLabelText('CA')).toHaveValue(12)
  })

  it('deve abrir vazio quando o molde é do zero, sem consultar o SRD', async () => {
    render(await NewNpcTemplatePage({ searchParams: Promise.resolve({}) }))

    expect(controllerMock.controlarStatsMonstro).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })
})
