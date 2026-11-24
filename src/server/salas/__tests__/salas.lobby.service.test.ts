import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    roomMember: { findUnique: vi.fn(), findMany: vi.fn() },
    roomCharacter: { findMany: vi.fn() },
    roomTempNpc: { findMany: vi.fn() },
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { NotFoundError } from '@/server/http/errors'
import {
  listarMinhasSalas,
  obterLobby,
  statusParaAssinar,
} from '@/server/salas/salas.lobby.service'

const SALA = { id: 'r-1', name: 'Mesa', status: 'lobby', code: 'AB2CD3' }
const NPC_FICHA = { name: 'Vilão', hpMax: 40, armorClass: 15, initiativeMod: 3 }

function membroAtivo(role: 'master' | 'player') {
  return { status: 'active', role, room: SALA }
}

// findMany de roomMember é chamado duas vezes no lobby do mestre: membros ativos
// e pedidos pendentes. Respondemos pelo filtro de status.
function mockMembros(ativos: unknown[], pendentes: unknown[] = []) {
  prismaMock.roomMember.findMany.mockImplementation(
    async ({ where }: { where: { status: string } }) =>
      where.status === 'pending' ? pendentes : ativos,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.roomCharacter.findMany.mockImplementation(
    async ({ where }: { where: { isNpc: boolean } }) =>
      where.isNpc
        ? [{ characterId: 'c-npc', character: NPC_FICHA }]
        : [
            {
              activeForUserId: 'u-jogador',
              character: { name: 'Julius', level: 3, srdClass: { name: 'Mago' } },
            },
          ],
  )
  prismaMock.roomTempNpc.findMany.mockResolvedValue([
    { id: 't-1', label: 'Goblin #1', hpMax: 7, armorClass: 12, initiativeMod: 2 },
  ])
  mockMembros([
    { userId: 'u-mestre', role: 'master', user: { name: 'Ana' } },
    { userId: 'u-jogador', role: 'player', user: { name: 'Bia' } },
  ])
})

describe('obterLobby para o mestre', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membroAtivo('master'))
  })

  it('deve ver o código, os stats dos NPCs e os pedidos pendentes', async () => {
    mockMembros(
      [{ userId: 'u-mestre', role: 'master', user: { name: 'Ana' } }],
      [{ userId: 'u-novo', statusChangedAt: new Date(), user: { name: 'Caio' } }],
    )

    const lobby = await obterLobby('u-mestre', 'r-1')

    expect(lobby.ehMestre).toBe(true)
    expect(lobby.sala.codigo).toBe('AB2CD3')
    expect(lobby.pedidos).toEqual([{ userId: 'u-novo', nome: 'Caio' }])
    expect(lobby.npcs).toEqual([
      {
        id: 'c-npc',
        rotulo: 'Vilão',
        tipo: 'persistente',
        stats: { hpMax: 40, armorClass: 15, initiativeMod: 3 },
      },
      {
        id: 't-1',
        rotulo: 'Goblin #1',
        tipo: 'temporario',
        stats: { hpMax: 7, armorClass: 12, initiativeMod: 2 },
      },
    ])
  })

  it('deve esconder pedido pendente expirado', async () => {
    mockMembros(
      [],
      [{ userId: 'u-velho', statusChangedAt: new Date('2020-01-01'), user: { name: 'Zé' } }],
    )

    const lobby = await obterLobby('u-mestre', 'r-1')

    expect(lobby.pedidos).toEqual([])
  })
})

describe('obterLobby para o jogador', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membroAtivo('player'))
  })

  it('deve ver só o rótulo dos NPCs, sem nenhum número', async () => {
    const lobby = await obterLobby('u-jogador', 'r-1')

    expect(lobby.npcs.map((n) => n.rotulo)).toEqual(['Vilão', 'Goblin #1'])
    expect(lobby.npcs.every((n) => n.stats === undefined)).toBe(true)
    expect(JSON.stringify(lobby)).not.toMatch(/hpMax|armorClass|"40"|:40/)
  })

  it('deve receber código e pedidos nulos/vazios, sem consultar pedidos', async () => {
    const lobby = await obterLobby('u-jogador', 'r-1')

    expect(lobby.ehMestre).toBe(false)
    expect(lobby.sala.codigo).toBeNull()
    expect(lobby.pedidos).toEqual([])
    expect(prismaMock.roomMember.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { roomId: 'r-1', status: 'pending' } }),
    )
  })

  it('deve mostrar nome, classe e nível do PJ ativo de cada jogador', async () => {
    const lobby = await obterLobby('u-jogador', 'r-1')

    expect(lobby.membros).toEqual([
      { userId: 'u-mestre', nome: 'Ana', papel: 'master', pj: null },
      {
        userId: 'u-jogador',
        nome: 'Bia',
        papel: 'player',
        pj: { nome: 'Julius', classe: 'Mago', nivel: 3 },
      },
    ])
  })

  it('deve ignorar PJ morto ao montar a lista', async () => {
    await obterLobby('u-jogador', 'r-1')

    expect(prismaMock.roomCharacter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId: 'r-1', isNpc: false, diedAt: null, activeForUserId: { not: null } },
      }),
    )
  })
})

describe('obterLobby sem acesso', () => {
  it.each([
    ['não é membro', null],
    ['ainda está pendente', { status: 'pending', role: 'player', room: SALA }],
    ['saiu', { status: 'left', role: 'player', room: SALA }],
    [
      'está numa sala destruída',
      { status: 'active', role: 'player', room: { ...SALA, status: 'destroyed' } },
    ],
  ])('deve tratar como sala não encontrada quem %s', async (_nome, membro) => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro)

    await expect(obterLobby('u-x', 'r-1')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('listarMinhasSalas', () => {
  it('deve listar só salas em que o usuário é membro ativo e que não foram destruídas', async () => {
    prismaMock.roomMember.findMany.mockResolvedValue([
      { room: { id: 'r-1', name: 'Mesa', status: 'lobby' } },
    ])

    const salas = await listarMinhasSalas('u-jogador')

    expect(salas).toEqual([{ id: 'r-1', name: 'Mesa', status: 'lobby' }])
    expect(prismaMock.roomMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-jogador', status: 'active', room: { status: { not: 'destroyed' } } },
      }),
    )
  })
})

describe('statusParaAssinar', () => {
  const vinculo = (status: string, sala = 'lobby') => ({ status, room: { status: sala } })

  it.each(['active', 'pending'])('deve permitir assinar como %s', async (status) => {
    prismaMock.roomMember.findUnique.mockResolvedValue(vinculo(status))

    await expect(statusParaAssinar('u-x', 'r-1')).resolves.toBe(status)
  })

  it.each([
    ['não tem vínculo', null],
    ['saiu', vinculo('left')],
    ['foi expulso', vinculo('banned')],
    ['foi recusado', vinculo('rejected')],
    ['está numa sala destruída', vinculo('active', 'destroyed')],
  ])('deve tratar como não encontrada a sala de quem %s', async (_nome, membro) => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro)

    await expect(statusParaAssinar('u-x', 'r-1')).rejects.toBeInstanceOf(NotFoundError)
  })
})
