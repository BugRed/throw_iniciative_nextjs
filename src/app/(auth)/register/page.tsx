import { FormularioRegistro } from '@/app/(auth)/register/formulario'
import { env } from '@/shared/lib/env'

export default function RegisterPage() {
  return <FormularioRegistro ambienteDev={env.NODE_ENV !== 'production'} />
}
