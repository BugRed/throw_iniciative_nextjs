import { z } from 'zod'

// Ponto único de validação de ambiente (regra do kit): falha no boot, não em
// runtime. Os defaults reproduzem o docker-compose de dev — fora dele (CI,
// produção), as variáveis obrigatórias precisam vir do ambiente.
const environmentSchema = z.object({
  DATABASE_URL: z.url({
    message: 'DATABASE_URL obrigatória (ex.: postgresql://user:senha@host:5432/app_dev)',
  }),
  NEXT_PUBLIC_BASE_URL: z.url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET precisa de 32+ caracteres'),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  OTEL_SDK_DISABLED: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_SERVICE_NAME: z.string().default('throw-iniciative'),
  S3_ENDPOINT: z.url().default('http://localhost:9003'),
  S3_BUCKET: z.string().default('app-bucket'),
  S3_ACCESS_KEY: z.string().default('app'),
  S3_SECRET_KEY: z.string().default('app123456'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.string().default('true'),
})

export const env = environmentSchema.parse(process.env)

export type Environment = z.infer<typeof environmentSchema>
