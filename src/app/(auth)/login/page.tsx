import { FormularioLogin } from '@/app/(auth)/login/formulario'
import { env } from '@/shared/lib/env'

export default function LoginPage() {
  const discordAtivo = Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET)

  return <FormularioLogin discordAtivo={discordAtivo} />
}
