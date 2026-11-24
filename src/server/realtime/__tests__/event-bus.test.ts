import { describe, expect, it, vi } from 'vitest'

import { type Assinante, EventBus } from '@/server/realtime/event-bus'

function assinante(userId: string, ativo = true): Assinante {
  return { userId, ativo, enviar: vi.fn(), fechar: vi.fn() }
}

describe('EventBus.publicar', () => {
  it('deve entregar evento geral a todos os membros ativos da sala', () => {
    const bus = new EventBus()
    const ana = assinante('ana')
    const bia = assinante('bia')
    bus.assinar('r-1', ana)
    bus.assinar('r-1', bia)

    bus.publicar({ tipo: 'npc:added', roomId: 'r-1' })

    expect(ana.enviar).toHaveBeenCalledWith({ tipo: 'npc:added', roomId: 'r-1' })
    expect(bia.enviar).toHaveBeenCalledTimes(1)
  })

  it('deve esconder evento geral de quem ainda é pedido pendente', () => {
    const bus = new EventBus()
    const pendente = assinante('caio', false)
    bus.assinar('r-1', pendente)

    bus.publicar({ tipo: 'character:changed', roomId: 'r-1' })

    expect(pendente.enviar).not.toHaveBeenCalled()
  })

  it('deve entregar evento endereçado só ao alvo, inclusive se for pendente', () => {
    const bus = new EventBus()
    const mestre = assinante('mestre')
    const pendente = assinante('caio', false)
    bus.assinar('r-1', mestre)
    bus.assinar('r-1', pendente)

    bus.publicar({ tipo: 'member:rejected', roomId: 'r-1', alvo: 'caio' })

    expect(pendente.enviar).toHaveBeenCalledTimes(1)
    expect(mestre.enviar).not.toHaveBeenCalled()
  })

  it('deve isolar as salas: evento de uma não chega à outra', () => {
    const bus = new EventBus()
    const outra = assinante('ana')
    bus.assinar('r-2', outra)

    bus.publicar({ tipo: 'room:destroyed', roomId: 'r-1' })

    expect(outra.enviar).not.toHaveBeenCalled()
  })

  it('deve ser inofensivo publicar numa sala sem ninguém conectado', () => {
    expect(() => new EventBus().publicar({ tipo: 'npc:added', roomId: 'vazia' })).not.toThrow()
  })
})

describe('EventBus.assinar e desconectar', () => {
  it('deve parar de entregar depois de cancelar a assinatura', () => {
    const bus = new EventBus()
    const ana = assinante('ana')
    const cancelar = bus.assinar('r-1', ana)

    cancelar()
    bus.publicar({ tipo: 'npc:added', roomId: 'r-1' })

    expect(ana.enviar).not.toHaveBeenCalled()
  })

  it('deve fechar só as conexões do usuário desconectado naquela sala', () => {
    const bus = new EventBus()
    const aqui = assinante('ana')
    const outroUsuario = assinante('bia')
    const outraSala = assinante('ana')
    bus.assinar('r-1', aqui)
    bus.assinar('r-1', outroUsuario)
    bus.assinar('r-2', outraSala)

    bus.desconectar('r-1', 'ana')

    expect(aqui.fechar).toHaveBeenCalledTimes(1)
    expect(outroUsuario.fechar).not.toHaveBeenCalled()
    expect(outraSala.fechar).not.toHaveBeenCalled()
  })

  it('deve tolerar que fechar() cancele a própria assinatura durante a varredura', () => {
    const bus = new EventBus()
    let cancelar = () => {}
    const ana: Assinante = { ...assinante('ana'), fechar: () => cancelar() }
    cancelar = bus.assinar('r-1', ana)

    expect(() => bus.desconectar('r-1', 'ana')).not.toThrow()
  })
})
