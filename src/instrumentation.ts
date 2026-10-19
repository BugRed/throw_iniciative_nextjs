// Carregado automaticamente pelo Next.js no boot do servidor (arquivo de
// convenção `instrumentation`). Como usamos o diretório `src/`, ele mora aqui —
// e não na raiz do projeto (ver node_modules/next/dist/docs/.../instrumentation.md).
//
// O SDK do OpenTelemetry (NodeSDK) só roda no runtime Node, nunca no Edge; por
// isso o guard de runtime abaixo é obrigatório.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}
