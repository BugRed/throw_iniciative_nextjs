# Operação (runbook)

Como o projeto é construído, implantado e operado. Aqui fica o que muda com o código,
**sem valores de secret**. O boilerplate já entrega o esqueleto (Docker, workflow de deploy,
OpenTelemetry, Prisma, SonarQube) — complete cada seção conforme o projeto for para produção.

## Ambientes

| Ambiente | Como sobe |
|---|---|
| **Desenvolvimento** | `yarn dev:up` (app + Postgres via `docker-compose.dev.yml`) ou `yarn dev` (só o Next no host). Use `yarn dev:logs` para acompanhar o log da app e `yarn db:logs` para o Postgres. |
| **Produção** | Imagem Docker publicada no Docker Hub e implantada no servidor (`DEPLOY_PATH`). |

Detalhes de cada modo estão no [`../../README.md`](../../README.md).

## Deploy

- Disparo: **push na `main`** aciona [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).
- Passos: checkout → build da imagem Docker → push para o Docker Hub → deploy no servidor.
- ⚠️ O workflow **precisa** estar em `.github/workflows/` (plural) para o Actions detectá-lo.
- Ajuste o placeholder `DEPLOY_PATH` (`/path/to/deploy/project-name`) para o caminho real do
  servidor do projeto.

## Rollback

- Reimplantar a **tag de imagem anterior** (Docker Hub) no servidor, **ou**
- `git revert` do commit problemático na `main` (re-dispara o deploy).
- Se houve migration, avaliar reverter o schema antes (Prisma) — ver seção Banco.

## Variáveis de ambiente e secrets (inventário — sem valores)

O template de variáveis é o [`.env.example`](../../.env.example); copie para `.env.local`.
Preencha a tabela abaixo por projeto — **só o inventário, nunca os valores**.

| Nome | Uso | Onde vive |
|---|---|---|
| `DATABASE_URL` | Conexão do Postgres (Prisma) | `.env.local` (dev) / `.env` no servidor / secret de CI |
| `DOCKER_HUB_USERNAME` | Publicar imagem | Secret do repositório (CI) |
| `DOCKER_HUB_TOKEN` | Publicar imagem | Secret do repositório (CI) |
| `OTEL_SDK_DISABLED` | Liga/desliga o OpenTelemetry | `.env.local` / ambiente |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint do OTel Collector | Ambiente (injetado pela infra) |
| `OTEL_SERVICE_NAME` | Nome do serviço nas métricas | `.env.local` / ambiente |

> **Nunca** commitar valores. O repositório guarda só este inventário; os valores vivem no
> secret manager / `.env` do servidor / secrets de CI.

## Observabilidade

- **OpenTelemetry** já instrumentado: [`src/instrumentation.ts`](../../src/instrumentation.ts)
  faz o guard de runtime e [`src/instrumentation.node.ts`](../../src/instrumentation.node.ts)
  inicializa o `NodeSDK` (métricas via OTLP/HTTP). Instrumentos de negócio em
  [`src/shared/lib/metrics.ts`](../../src/shared/lib/metrics.ts). Detalhes no README.
- **SonarQube** local (`yarn sonar`) para qualidade/estático — configuração em
  [`sonar/`](../../sonar/). Em CI, push na `dev` dispara
  [`.github/workflows/sonar.yml`](../../.github/workflows/sonar.yml), que roda
  `yarn test:cov` e envia o `coverage/lcov.info` junto com a análise, alimentando o
  % de cobertura no dashboard do Sonar.

## Banco de dados

- PostgreSQL, acessado via Prisma. Schema **modular** em [`prisma/schema/`](../../prisma/schema/)
  (um `*.prisma` por domínio) — ver a seção *Banco de dados (Prisma)* do README.
- **Migrations:** gerar/aplicar com `yarn db:migrate` (rodam no container `app`).
- **Backup/retenção:** a definir por projeto (política de dump + restauração de teste).

> Runbook inicial — complete com endpoints reais, política de backup e passo a passo de
> incidentes conforme o projeto for para produção.
