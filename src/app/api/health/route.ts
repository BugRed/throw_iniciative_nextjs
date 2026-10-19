// Rota de exemplo demonstrando o uso das métricas de negócio (ver
// src/shared/lib/metrics.ts). Numa app real, a regra de negócio — e o registro
// das métricas de domínio — vive no service; o route handler só traduz HTTP e
// delega. Aqui mantemos tudo na rota apenas para servir de exemplo mínimo.
import { duracaoOperacaoSegundos, requisicoesTotal } from '@/shared/lib/metrics'

export async function GET() {
  const inicio = performance.now()

  requisicoesTotal.add(1, { rota: 'health' })
  duracaoOperacaoSegundos.record((performance.now() - inicio) / 1000, { rota: 'health' })

  return Response.json({ status: 'ok' })
}
