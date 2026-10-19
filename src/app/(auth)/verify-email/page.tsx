import { Suspense } from 'react'

import { PainelVerificacao } from '@/app/(auth)/verify-email/painel'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="font-serif text-ink-500">Verificando…</p>}>
      <PainelVerificacao />
    </Suspense>
  )
}
