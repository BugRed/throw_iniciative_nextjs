import { createAuthClient } from 'better-auth/client'

// Client de browser para o Better Auth (login/registro/verificação/signOut).
// baseURL inferred da origem da página.
export const authClient = createAuthClient()
