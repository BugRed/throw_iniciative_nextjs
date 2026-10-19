// Instrumentos de métricas de negócio compartilhados.
//
// CPU/RAM/pods a infra já entrega sozinha — o valor do SDK é medir o SEU domínio.
// Crie cada instrumento UMA única vez aqui e importe onde precisar (rotas, services).
//
// Regras de ouro:
//   - Counter    → "quantas vezes aconteceu" (só cresce). Sufixo `_total`.
//   - Histogram  → durações/tamanhos. Unidade no nome (`_segundos`, `_bytes`) e em `unit`.
//   - Atributos  → só rótulos de baixa cardinalidade (plano: 'pro' | 'free' ✅;
//                  user_id ❌ — explode a cardinalidade e o custo do Prometheus).
//
// Os instrumentos abaixo são EXEMPLOS — troque/estenda conforme o domínio do projeto.
import { metrics } from '@opentelemetry/api'

// Use o nome do serviço/domínio como identificador do meter.
const meter = metrics.getMeter(process.env.OTEL_SERVICE_NAME ?? 'app')

/** Exemplo: total de requisições atendidas por uma rota. */
export const requisicoesTotal = meter.createCounter('requisicoes_total', {
  description: 'Total de requisições atendidas',
})

/** Exemplo: duração de uma operação de negócio, em segundos. */
export const duracaoOperacaoSegundos = meter.createHistogram('operacao_duracao_segundos', {
  description: 'Duração de uma operação de negócio',
  unit: 's',
})

/** Total de erros não tratados que chegaram à fronteira HTTP. */
export const errosNaoTratadosTotal = meter.createCounter('erros_nao_tratados_total', {
  description: 'Total de erros não tratados na fronteira HTTP',
})
