import { NextResponse } from 'next/server'

import { handleRoute } from '@/server/http/errors'
import { controlarAssinatura } from '@/server/salas/salas.controller'

// Stream SSE da sala: a rota só traduz HTTP e delega ao controller, que valida
// sessão e vínculo. `req.signal` aborta quando o cliente fecha a conexão.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params
    const fluxo = await controlarAssinatura(id, req.signal)
    return new NextResponse(fluxo, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Nginx e afins seguram a resposta em buffer e o evento nunca chega.
        'X-Accel-Buffering': 'no',
      },
    })
  })
}
