import { FormAcao } from '@/shared/components/molecules/FormAcao'
import type { AcaoFormulario } from '@/shared/lib/estado-acao'

// Só o mestre vê: toda sala é privada, então o código sozinho só abre um pedido.
export function PedidosEntrada({
  roomId,
  pedidos,
  acao,
}: {
  roomId: string
  pedidos: { userId: string; nome: string }[]
  acao: AcaoFormulario
}) {
  if (pedidos.length === 0) return null

  return (
    <section aria-label="Pedidos de entrada" className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink-900">Pedidos de entrada</h2>
      <ul className="flex flex-col gap-2">
        {pedidos.map((pedido) => (
          <li
            key={pedido.userId}
            className="flex items-center justify-between gap-3 rounded-md border border-gold-500/40 bg-gold-400/10 px-4 py-2"
          >
            <span className="font-serif text-ink-900">{pedido.nome}</span>
            <div className="flex gap-2">
              <FormAcao
                acao={acao}
                rotulo="Aceitar"
                variante="primary"
                campos={{ roomId, usuarioId: pedido.userId, decisao: 'aceitar' }}
              />
              <FormAcao
                acao={acao}
                rotulo="Recusar"
                variante="ghost"
                campos={{ roomId, usuarioId: pedido.userId, decisao: 'recusar' }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
