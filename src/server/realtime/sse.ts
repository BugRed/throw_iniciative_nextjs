import { type Assinante, type EventBus, type EventoSala } from '@/server/realtime/event-bus'

// Formato text/event-stream. O payload leva só o id da sala: o cliente refaz a
// leitura autorizada em vez de confiar em dado vindo pelo stream.
const HEARTBEAT_MS = 25_000

export function formatarEvento(evento: EventoSala): string {
  return `event: ${evento.tipo}\ndata: ${JSON.stringify({ roomId: evento.roomId })}\n\n`
}

type OpcoesFluxo = {
  bus: EventBus
  roomId: string
  userId: string
  ativo: boolean
  signal: AbortSignal
}

export function criarFluxoSse({
  bus,
  roomId,
  userId,
  ativo,
  signal,
}: OpcoesFluxo): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder()
  let limpar = () => {}
  let fechar = () => {}

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const escrever = (texto: string) => controller.enqueue(codificador.encode(texto))
      let aberto = true
      const assinante: Assinante = {
        userId,
        ativo,
        enviar: (evento) => aberto && escrever(formatarEvento(evento)),
        fechar: () => fechar(),
      }
      const cancelarAssinatura = bus.assinar(roomId, assinante)
      // Comentário periódico: proxies e navegadores derrubam stream ocioso.
      const batida = setInterval(() => escrever(': ping\n\n'), HEARTBEAT_MS)

      limpar = () => {
        aberto = false
        clearInterval(batida)
        cancelarAssinatura()
      }
      // Fechar o stream depois de o cliente cancelar lançaria; por isso a
      // limpeza (sempre) é separada do close (só quando fomos nós a encerrar).
      fechar = () => {
        if (!aberto) return
        limpar()
        controller.close()
      }
      signal.addEventListener('abort', fechar, { once: true })
      if (signal.aborted) return fechar()
      escrever(': conectado\n\n')
    },
    cancel() {
      limpar()
    },
  })
}
