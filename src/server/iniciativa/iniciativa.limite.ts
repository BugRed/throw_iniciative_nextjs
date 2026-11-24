import { TooManyRequestsError } from '@/server/http/errors'

// Rate limit da rolagem (docs/negocio/iniciativa.md): janela deslizante em memória,
// por usuário. O lote de NPCs conta uma ação por NPC. O hardening completo é P12;
// a interface fica pronta para trocar o armazenamento por Redis.

export const MAX_ACOES_POR_JANELA = 30
export const JANELA_MS = 60_000

export class LimiteDeAcoes {
  private readonly consumos = new Map<string, { em: number; qtd: number }[]>()

  constructor(
    private readonly max = MAX_ACOES_POR_JANELA,
    private readonly janelaMs = JANELA_MS,
    private readonly agora: () => number = Date.now,
  ) {}

  // Recusa o pedido inteiro (sem registrar nada) se ele estourar a janela.
  consumir(chave: string, quantidade = 1): void {
    const agora = this.agora()
    const vigentes = (this.consumos.get(chave) ?? []).filter((c) => agora - c.em < this.janelaMs)
    const usado = vigentes.reduce((soma, c) => soma + c.qtd, 0)
    if (usado + quantidade > this.max) {
      this.consumos.set(chave, vigentes)
      throw new TooManyRequestsError('Muitas rolagens, aguarde alguns segundos.')
    }
    this.consumos.set(chave, [...vigentes, { em: agora, qtd: quantidade }])
  }
}

// Singleton no globalThis, como o EventBus: o hot-reload reavaliaria o módulo.
const globalComLimite = globalThis as unknown as { limiteRolagem?: LimiteDeAcoes }
export const limiteRolagem = (globalComLimite.limiteRolagem ??= new LimiteDeAcoes())
