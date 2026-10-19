import { randomUUID } from 'node:crypto'

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { registrarEmailDev } from '@/server/auth/caixa-de-entrada-dev'
import { prisma } from '@/server/db/prisma'
import { env } from '@/shared/lib/env'

// Discord é opcional por env: sem CLIENT_ID/SECRET o produto segue 100%
// funcional por e-mail/senha e o botão some do login (decisão local-first).
const discordConfigurado = env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  advanced: {
    database: {
      // honra a convenção do repo: PKs uuid geradas pela própria lib
      generateId: () => randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await registrarEmailDev({
        para: user.email,
        assunto: 'Redefinição de senha',
        url,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      // O link abre a PÁGINA /verify-email, não a API: quem clica vê a
      // confirmação (ou o erro de link expirado) com a cara do produto — a
      // página é quem chama a API por baixo.
      const urlDaPagina = new URL('/verify-email', url)
      urlDaPagina.searchParams.set('token', token)
      await registrarEmailDev({
        para: user.email,
        assunto: 'Verifique seu e-mail',
        url: urlDaPagina.toString(),
      })
    },
  },
  ...(discordConfigurado
    ? {
        socialProviders: {
          discord: {
            clientId: env.DISCORD_CLIENT_ID ?? '',
            clientSecret: env.DISCORD_CLIENT_SECRET ?? '',
          },
        },
      }
    : {}),
})

export type Sessao = NonNullable<typeof auth.$Infer.Session>
export type UsuarioAutenticado = Sessao['user']
