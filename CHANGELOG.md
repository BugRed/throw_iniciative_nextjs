# Changelog

Todas as mudanças notáveis deste projeto ficam documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e este
projeto adere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Não lançado]

### Adicionado

- Fundação do app Throw Iniciative a partir do boilerplate FH: stack Next 16 + Prisma +
  Docker de dev, mesclada ao kit de processo fh-estado na raiz do repo (ADRs 0001–0020).
- Landing pública do produto em RSC puro e validação de ambiente no boot
  (`src/shared/lib/env.ts`).
- Auth com Better Auth sobre adapter Prisma (ADR-0023): e-mail/senha com verificação
  obrigatória, reset de senha, sessão em cookie httpOnly e Discord OAuth opcional por
  env; em dev, `/dev/caixa-de-entrada` substitui o provedor de e-mail (links de
  verificação/reset ficam lá).
- Modelo de dados de domínio completo (P3): 5 arquivos Prisma modulares (SRD, personagens,
  salas, iniciativa, plataforma) com 20 tabelas, 6 enums, CHECK XOR de participante escrito
  à mão na migration e UNIQUE de 1 PJ ativo por sala — detalhes em
  [`docs/db/modelo-de-dados.md`](./docs/db/modelo-de-dados.md).
- Importação do SRD 5.2 (CC-BY 4.0): `yarn srd:fetch` baixa os 9 JSON do 5e-bits/5e-database
  pinados por commit; `yarn db:seed` popula as tabelas `srd_*` com upsert idempotente e
  relatório por tabela (9 espécies, 12 classes, 12 subclasses, 232 features, 4 backgrounds,
  17 feats, 339 magias, 182 equipamentos, 341 monstros). Serviço de consulta do SRD para o
  wizard; atribuição no rodapé da landing e em `docs/contexto.md`.

### Alterado

- Identidade do template substituída pela do produto (package, metadata, `lang="pt-BR"`).

### Removido

- Casca de template sem propósito no produto: área `/admin`, domínio `example`, landing e
  kit de processo antigos do boilerplate.
