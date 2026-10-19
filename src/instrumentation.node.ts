// Inicialização do OpenTelemetry (somente runtime Node — ver instrumentation.ts).
//
// A app NUNCA conhece o hub de observabilidade: ela só fala com um OTel Collector
// que a infra sobe como sidecar no mesmo pod (localhost:4318). O destino real vem
// de OTEL_EXPORTER_OTLP_ENDPOINT, injetada pela infra — nenhuma URL fica no código.
//
// Sem collector (ex.: rodando local), defina OTEL_SDK_DISABLED=true no .env.local:
// o NodeSDK respeita essa variável nativamente e o `sdk.start()` vira no-op, então
// a app jamais quebra por causa de telemetria.
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'app',
  }),
  metricReader: new PeriodicExportingMetricReader({
    // O endpoint vem de OTEL_EXPORTER_OTLP_ENDPOINT (default http://localhost:4318).
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15000,
  }),
})

sdk.start()
