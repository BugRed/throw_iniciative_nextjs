import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn() },
    roomMember: { findUnique: vi.fn() },
    character: { findUnique: vi.fn() },
    roomCharacter: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    npcTemplate: { findFirst: vi.fn() },
    roomTempNpc: { aggregate: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import {
  anexarNpcPersistente,
  anexarPersonagem,
  instanciarNpcTemporario,
  removerNpcPersistente,
  removerNpcTemporario,
} from '@/server/salas/salas.elenco.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'
const SALA = { id: 'r-1', status: 'lobby', masterUserId: MESTRE }
const MOLDE_ID = '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f'
const MOLDE = {
  id: 'm-1',
  name: 'Goblin',
  hpMax: 7,
  armorClass: 12,
  initiativeMod: 2,
  statblock: { hit_points: 7 },
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.findUnique.mockResolvedValue(SALA)
})

describe('anexarPersonagem', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue({
      status: 'active',
      role: 'player',
      room: SALA,
    })
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'c-1',
      ownerUserId: JOGADOR,
      isNpc: false,
    })
    prismaMock.roomCharacter.findUnique.mockResolvedValue(null)
  })

  it('deve trocar o PJ ativo: solta o vivo anterior e anexa o novo', async () => {
    await anexarPersonagem(JOGADOR, 'r-1', 'c-1')

    expect(prismaMock.roomCharacter.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 'r-1', activeForUserId: JOGADOR, diedAt: null },
    })
    expect(prismaMock.roomCharacter.upsert).toHaveBeenCalledWith({
      where: { roomId_characterId: { roomId: 'r-1', characterId: 'c-1' } },
      create: { roomId: 'r-1', characterId: 'c-1', activeForUserId: JOGADOR },
      update: { activeForUserId: JOGADOR },
    })
  })

  it('deve ser idempotente quando o PJ já é o ativo', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue({
      activeForUserId: JOGADOR,
      diedAt: null,
    })

    await anexarPersonagem(JOGADOR, 'r-1', 'c-1')

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('deve barrar o PJ que morreu nesta sala', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue({
      activeForUserId: null,
      diedAt: new Date(),
    })

    await expect(anexarPersonagem(JOGADOR, 'r-1', 'c-1')).rejects.toThrow(/morreu nesta sala/)
    expect(prismaMock.roomCharacter.upsert).not.toHaveBeenCalled()
  })
})

describe('anexarPersonagem: quem pode anexar o quê', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue({
      status: 'active',
      role: 'player',
      room: SALA,
    })
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'c-1',
      ownerUserId: JOGADOR,
      isNpc: false,
    })
    prismaMock.roomCharacter.findUnique.mockResolvedValue(null)
  })

  it('deve impedir o mestre de anexar PJ', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({
      status: 'active',
      role: 'master',
      room: SALA,
    })

    await expect(anexarPersonagem(MESTRE, 'r-1', 'c-1')).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    ['é de outro dono', { id: 'c-1', ownerUserId: 'u-outro', isNpc: false }],
    ['é NPC', { id: 'c-1', ownerUserId: JOGADOR, isNpc: true }],
    ['não existe', null],
  ])('deve tratar como não encontrado o personagem que %s', async (_nome, personagem) => {
    prismaMock.character.findUnique.mockResolvedValue(personagem)

    await expect(anexarPersonagem(JOGADOR, 'r-1', 'c-1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('deve recusar com a sala encerrada', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({
      status: 'active',
      role: 'player',
      room: { ...SALA, status: 'finished' },
    })

    await expect(anexarPersonagem(JOGADOR, 'r-1', 'c-1')).rejects.toBeInstanceOf(ConflictError)
  })

  it('deve tratar quem não é membro ativo como sala não encontrada', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({ status: 'pending', room: SALA })

    await expect(anexarPersonagem(JOGADOR, 'r-1', 'c-1')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('NPC persistente', () => {
  it('deve anexar ficha de NPC do próprio mestre', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ ownerUserId: MESTRE, isNpc: true })
    prismaMock.roomCharacter.findUnique.mockResolvedValue(null)

    await anexarNpcPersistente(MESTRE, 'r-1', 'c-9')

    expect(prismaMock.roomCharacter.create).toHaveBeenCalledWith({
      data: { roomId: 'r-1', characterId: 'c-9', isNpc: true },
    })
  })

  it.each([
    ['de outro mestre', { ownerUserId: 'u-outro', isNpc: true }],
    ['que é PJ', { ownerUserId: MESTRE, isNpc: false }],
  ])('deve recusar ficha %s', async (_nome, ficha) => {
    prismaMock.character.findUnique.mockResolvedValue(ficha)

    await expect(anexarNpcPersistente(MESTRE, 'r-1', 'c-9')).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.roomCharacter.create).not.toHaveBeenCalled()
  })

  it('deve recusar NPC que já está na sala', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ ownerUserId: MESTRE, isNpc: true })
    prismaMock.roomCharacter.findUnique.mockResolvedValue({ characterId: 'c-9' })

    await expect(anexarNpcPersistente(MESTRE, 'r-1', 'c-9')).rejects.toBeInstanceOf(ConflictError)
  })

  it('deve recusar quem não é o mestre', async () => {
    await expect(anexarNpcPersistente(JOGADOR, 'r-1', 'c-9')).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('deve remover só NPC e avisar quando ele não está na sala', async () => {
    prismaMock.roomCharacter.deleteMany.mockResolvedValue({ count: 0 })

    await expect(removerNpcPersistente(MESTRE, 'r-1', 'c-9')).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.roomCharacter.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 'r-1', characterId: 'c-9', isNpc: true },
    })
  })
})

describe('instanciarNpcTemporario', () => {
  beforeEach(() => {
    prismaMock.npcTemplate.findFirst.mockResolvedValue(MOLDE)
    prismaMock.roomTempNpc.aggregate.mockResolvedValue({ _max: { instanceNumber: null } })
    prismaMock.roomTempNpc.createMany.mockResolvedValue({ count: 3 })
  })

  it('deve criar a quantidade pedida numerada a partir de #1 e copiar os stats', async () => {
    const criados = await instanciarNpcTemporario(MESTRE, 'r-1', {
      moldeId: MOLDE_ID,
      quantidade: 3,
    })

    expect(criados).toBe(3)
    const { data } = prismaMock.roomTempNpc.createMany.mock.calls[0][0]
    expect(data.map((d: { label: string }) => d.label)).toEqual([
      'Goblin #1',
      'Goblin #2',
      'Goblin #3',
    ])
    expect(data[0]).toEqual({
      roomId: 'r-1',
      npcTemplateId: 'm-1',
      label: 'Goblin #1',
      instanceNumber: 1,
      hpCurrent: 7,
      hpMax: 7,
      armorClass: 12,
      initiativeMod: 2,
      statblock: { hit_points: 7 },
    })
  })

  it('deve continuar do maior número já usado do molde na sala', async () => {
    prismaMock.roomTempNpc.aggregate.mockResolvedValue({ _max: { instanceNumber: 4 } })

    await instanciarNpcTemporario(MESTRE, 'r-1', { moldeId: MOLDE_ID, quantidade: 2 })

    const { data } = prismaMock.roomTempNpc.createMany.mock.calls[0][0]
    expect(data.map((d: { label: string }) => d.label)).toEqual(['Goblin #5', 'Goblin #6'])
  })

  it('deve aceitar molde próprio ou público, e só esses', async () => {
    await instanciarNpcTemporario(MESTRE, 'r-1', { moldeId: MOLDE_ID, quantidade: 1 })

    expect(prismaMock.npcTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: MOLDE_ID, OR: [{ ownerUserId: MESTRE }, { isPublic: true }] },
    })
  })
})

describe('instanciarNpcTemporario: recusas', () => {
  beforeEach(() => {
    prismaMock.npcTemplate.findFirst.mockResolvedValue(MOLDE)
    prismaMock.roomTempNpc.aggregate.mockResolvedValue({ _max: { instanceNumber: null } })
    prismaMock.roomTempNpc.createMany.mockResolvedValue({ count: 3 })
  })

  it('deve recusar molde inexistente ou privado de outro mestre', async () => {
    prismaMock.npcTemplate.findFirst.mockResolvedValue(null)

    await expect(
      instanciarNpcTemporario(MESTRE, 'r-1', { moldeId: MOLDE_ID, quantidade: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it.each([0, 21, 1.5, -1])('deve recusar quantidade %s', async (quantidade) => {
    await expect(
      instanciarNpcTemporario(MESTRE, 'r-1', { moldeId: MOLDE_ID, quantidade }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(prismaMock.roomTempNpc.createMany).not.toHaveBeenCalled()
  })

  it('deve recusar molde que não é UUID', async () => {
    await expect(
      instanciarNpcTemporario(MESTRE, 'r-1', { moldeId: 'x', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('deve remover instância só da própria sala', async () => {
    prismaMock.roomTempNpc.deleteMany.mockResolvedValue({ count: 0 })

    await expect(removerNpcTemporario(MESTRE, 'r-1', 't-1')).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.roomTempNpc.deleteMany).toHaveBeenCalledWith({
      where: { id: 't-1', roomId: 'r-1' },
    })
  })
})
