# Documentação — Boilerplate FH

Hub da documentação. Este diretório é o **molde de documentação viva** que todo projeto
da FH herda do boilerplate: a estrutura de pastas e as convenções já vêm prontas; cada
projeto só preenche com o seu conteúdo. Assim a **passagem de bastão** entre o time do MVP
e o time da plataforma acontece sem atrito — a documentação mora sempre no mesmo lugar.

Seguimos **docs-as-code**: tudo aqui é Markdown versionado no repositório, revisado em PR e
atualizado **no mesmo PR** que muda o código. Nada de documentação viva presa em Google Docs
ou Notion (esses servem só para o que é institucional e estável — ver [Regras de ouro](#regras-de-ouro)).

## Mapa da documentação

| Precisa de… | Vá para |
|---|---|
| **Entender o produto** (o que é, personas, arquitetura) | [`contexto.md`](./contexto.md) |
| **Regras de negócio** (o que vale e por quê) | [`negocio/`](./negocio/) |
| **Decisões de arquitetura** (por que é assim) | [`adr/`](./adr/) |
| **Modelo de dados** (tabelas, colunas) | [`db/modelo-de-dados.md`](./db/modelo-de-dados.md) |
| **Specs de features** (por responsabilidade) | [`features/`](./features/) |
| **Operar** (deploy, env/secrets, observabilidade) | [`ops/`](./ops/) |
| **Para onde vamos / o que mudou** | [`../ROADMAP.md`](../ROADMAP.md) · [`../CHANGELOG.md`](../CHANGELOG.md) |
| **Contribuir** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) · [`../SECURITY.md`](../SECURITY.md) |

## Como a documentação é organizada

Cada tipo de conhecimento tem **um** lar (uma fonte da verdade); os outros linkam, não copiam:

- **Explicação** → `contexto.md` (visão do produto) e `negocio/` (regras).
- **Referência** → `db/` (dados) e, no futuro, referência de API.
- **Decisão** → `adr/` (imutável: por que escolhemos X).
- **Spec de feature** → `features/<responsabilidade>/` (o que construir).
- **How-to / operação** → `ops/`.

## Regras de ouro

1. **Uma fonte da verdade por fato.** Se precisa repetir, **linke**.
2. **Muda com o código? Vive no repo.** É estável e institucional (visão macro da empresa,
   servidor, inventário de secrets)? Pode viver no Google Docs — mas **sem valores de secret**.
3. **Regra ≠ feature ≠ decisão.** Regra em `negocio/`, spec em `features/`, decisão em `adr/`.
4. **Atualize a doc no mesmo PR** que muda o comportamento. Doc desatualizada é pior que doc
   ausente — a Definition of Done em [`../CONTRIBUTING.md`](../CONTRIBUTING.md) cobra isso.

## Ao iniciar um projeto a partir do boilerplate

Esta estrutura vem vazia de propósito (moldes comentados). Para adaptá-la:

1. Preencha [`contexto.md`](./contexto.md) — o que o produto é e que problema resolve.
2. Ajuste as **responsabilidades** em [`features/`](./features/) à realidade do projeto
   (remova as que não usar, crie novas com um `README.md` curto).
3. Registre as primeiras decisões em [`adr/`](./adr/) a partir do [`adr/TEMPLATE.md`](./adr/TEMPLATE.md).
4. Escreva o modelo de dados em [`db/modelo-de-dados.md`](./db/modelo-de-dados.md) conforme
   o schema Prisma for tomando forma.
5. Se o projeto tratar **dados pessoais**, adicione um `docs/privacidade-lgpd.md`.
6. Mantenha [`../ROADMAP.md`](../ROADMAP.md) e [`../CHANGELOG.md`](../CHANGELOG.md) vivos.
