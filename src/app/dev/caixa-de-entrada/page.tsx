import { notFound } from 'next/navigation'

import { listarEmailsDev } from '@/server/auth/caixa-de-entrada-dev'

export const dynamic = 'force-dynamic'

// Caixa de entrada de dev: os links de verificação/reset gerados pelo Better
// Auth em ambiente local. Fora de dev, a rota não existe.
export default function CaixaDeEntradaPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const emails = listarEmailsDev()

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-wine-500">Caixa de entrada (dev)</h1>
      <p className="font-serif text-sm text-ink-500">
        Em dev, os e-mails de verificação e redefinição de senha caem aqui — nenhum provedor externo
        é chamado.
      </p>
      {emails.length === 0 ? (
        <p className="font-serif text-ink-500">
          Nenhum e-mail ainda. Registre uma conta ou peça redefinição de senha.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {emails.map((email) => (
            <li
              key={`${email.criadoEm.toISOString()}-${email.url}`}
              className="rounded-lg border border-gold-500/50 bg-paper-50 p-4"
            >
              <p className="font-sans text-sm text-ink-500">
                {email.criadoEm.toLocaleTimeString('pt-BR')} · {email.para}
              </p>
              <p className="font-serif font-semibold text-ink-900">{email.assunto}</p>
              <a href={email.url} className="font-sans text-sm text-wine-500 hover:underline">
                Abrir link
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
