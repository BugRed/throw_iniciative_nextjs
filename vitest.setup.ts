// Adiciona matchers do jest-dom ao expect do Vitest
// (ex.: toBeInTheDocument, toHaveTextContent, toBeVisible...)
import '@testing-library/jest-dom/vitest'

// Testes que tocam o app (env.ts valida no boot do acesso a banco/auth)
// precisam das variáveis de dev — as mesmas do docker-compose. `.env` é local
// e nunca versionado; ausente (CI), os testes que dependem de env o stubam.
try {
  process.loadEnvFile?.()
} catch {
  /* CI sem .env: env.test stuba o que precisa */
}
