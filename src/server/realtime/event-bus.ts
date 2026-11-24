import type { TipoEventoSala } from '@/shared/lib/eventos-sala'

// Broker em processo (ADR/plano: SSE + EventBus em memória). Multi-instância
// é pós-MVP: com mais de um processo, o evento só chega a quem está conectado
// na mesma instância — a troca por Redis cabe atrás desta mesma interface.

export type { TipoEventoSala }

// O evento só avisa que algo mudou: o cliente refaz a leitura, que passa pela
// autorização do servidor. `alvo` restringe a entrega a um usuário.
export type EventoSala = { tipo: TipoEventoSala; roomId: string; alvo?: string }

export type Assinante = {
  userId: string
  // `pending` assina para saber o resultado do próprio pedido, nada além.
  ativo: boolean
  enviar: (evento: EventoSala) => void
  fechar: () => void
}

export class EventBus {
  private readonly assinantes = new Map<string, Set<Assinante>>()

  assinar(roomId: string, assinante: Assinante): () => void {
    const grupo = this.assinantes.get(roomId) ?? new Set<Assinante>()
    grupo.add(assinante)
    this.assinantes.set(roomId, grupo)
    return () => {
      grupo.delete(assinante)
      if (grupo.size === 0 && this.assinantes.get(roomId) === grupo) this.assinantes.delete(roomId)
    }
  }

  publicar(evento: EventoSala): void {
    for (const assinante of this.assinantes.get(evento.roomId) ?? []) {
      const recebe = evento.alvo ? assinante.userId === evento.alvo : assinante.ativo
      if (recebe) assinante.enviar(evento)
    }
  }

  // Quem saiu ou foi expulso não pode continuar ouvindo a sala.
  desconectar(roomId: string, userId: string): void {
    for (const assinante of [...(this.assinantes.get(roomId) ?? [])]) {
      if (assinante.userId === userId) assinante.fechar()
    }
  }
}

// Singleton no globalThis pelo mesmo motivo do Prisma: o hot-reload do Next
// reavalia o módulo e criaria um broker novo, deixando as conexões órfãs.
const globalParaBus = globalThis as unknown as { eventBus?: EventBus }

export const eventBus = globalParaBus.eventBus ?? new EventBus()
globalParaBus.eventBus = eventBus
