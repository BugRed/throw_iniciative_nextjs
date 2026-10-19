import { auth } from '@/server/auth/auth'

// Fronteira HTTP de auth: o Better Auth cuida de toda a rota (OAuth, sessão,
// verificação, reset). Tradução própria de HTTP aqui seria duplicar o handler.
export const GET = auth.handler
export const POST = auth.handler
