import { env } from '@/shared/lib/env'

// Transporte de e-mail de dev: Better Auth chama sendVerificationEmail/
// sendResetPassword com a URL mágica; em dev ela vai para esta caixa em
// memória, lida por /dev/caixa-de-entrada. Em produção, ainda sem provedor,
// o envio é no-op contabilizado — plugar SMTP/Resend aqui na P13.
export type EmailDev = {
  para: string
  assunto: string
  url: string
  criadoEm: Date
}

const LIMITE_CAIXA = 50

// A caixa mora no globalThis (mesmo padrão do prisma.ts): em dev o Next compila
// cada rota como entry própria, então um array no escopo do módulo teria uma
// instância por rota — o e-mail registrado pelo /api/auth nunca seria visto
// pela página /dev/caixa-de-entrada.
const globalParaCaixa = globalThis as typeof globalThis & {
  __caixaDeEntradaDev?: EmailDev[]
}
const caixa: EmailDev[] = (globalParaCaixa.__caixaDeEntradaDev ??= [])

export async function registrarEmailDev(email: Omit<EmailDev, 'criadoEm'>): Promise<void> {
  if (env.NODE_ENV === 'production') {
    return
  }

  caixa.unshift({ ...email, criadoEm: new Date() })
  if (caixa.length > LIMITE_CAIXA) {
    caixa.length = LIMITE_CAIXA
  }
}

export function listarEmailsDev(): EmailDev[] {
  return [...caixa]
}
