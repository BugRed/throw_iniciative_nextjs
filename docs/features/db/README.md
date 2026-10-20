# Features — DB

Specs de **modelo de dados, migrations e seeds**: o schema Prisma transacional
(`prisma/schema/`, modular), constraints, índices e a doc de modelo
([`docs/db/modelo-de-dados.md`](../../db/modelo-de-dados.md)).

Fronteira: aqui mora o que muda a **forma** dos dados. **Regras de negócio** sobre esses
dados vivem em [`../../negocio/`](../../negocio/); leitura agregada/analytics (relatórios,
métricas) em [`../dados/`](../dados/).

Crie specs a partir do [`../TEMPLATE.md`](../TEMPLATE.md).
