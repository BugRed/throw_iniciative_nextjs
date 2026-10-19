# Features

Specs das features — o registro durável de *o que* cada funcionalidade faz, *por que* existe
e *como* se comporta. É onde uma feature é pensada antes de virar código e fica documentada
depois.

## Organização — por responsabilidade

As specs são separadas em subdiretórios por **responsabilidade** (a camada/domínio técnico
que a feature toca), não por persona. As pastas abaixo são um ponto de partida — **adapte ao
seu projeto**: remova as que não usar e crie novas conforme precisar.

| Pasta | Responsabilidade |
|---|---|
| [`api/`](./api/) | Route handlers, controllers, services e contratos de dados. |
| [`ui/`](./ui/) | Telas, rotas e componentes (Atomic Design). |
| [`seguranca/`](./seguranca/) | Autenticação, autorização (RBAC), proteção de dados, secrets. |
| [`integracoes/`](./integracoes/) | Serviços externos (SSO, e-mail, provedores de terceiros). |
| [`dados/`](./dados/) | Relatórios, métricas e analytics (leitura agregada). |
| [`db/`](./db/) | Modelo de dados transacional: schema Prisma, migrations, seeds, constraints. |
| [`testes/`](./testes/) | Estratégia e planos de teste (o código de teste fica junto do código). |
| [`design/`](./design/) | Mudanças de design / UI (o Design System vive no Figma + Tailwind). |
| [`seo/`](./seo/) | robots.txt, sitemap.xml e otimização para mecanismos de busca. |
| [`processo/`](./processo/) | Processo de desenvolvimento assistido por IA (continuidade entre sessões, rituais de feature). |

> Precisou de uma responsabilidade nova? Crie a pasta com um `README.md` curto descrevendo o
> escopo dela.

## Convenções

- **Um arquivo por feature**, criado a partir de [`TEMPLATE.md`](./TEMPLATE.md).
- Nome: `NNNN-nome-curto.md`, com `NNNN` sequencial **dentro da pasta** (`api/0001-...`,
  `ui/0001-...`).
- Uma feature que cruza camadas vive na pasta da sua **responsabilidade principal** e
  **linka** as outras — não duplique a spec.
- Regras de negócio **não** entram aqui: elas vivem em [`../negocio/`](../negocio/); a spec
  as referencia.
- Ao entregar, registre no [`CHANGELOG.md`](../../CHANGELOG.md).
