import { Suspense } from 'react'

import { PainelRedefinicao } from '@/app/(auth)/reset-password/painel'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="font-serif text-ink-500">Carregando…</p>}>
      <PainelRedefinicao />
    </Suspense>
  )
}
