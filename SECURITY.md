# Política de Segurança

## Como reportar uma vulnerabilidade

Se você encontrar uma vulnerabilidade de segurança, **não abra uma issue pública**. Reporte
de forma privada para **suporte@fhdataanalysis.com** com:

- descrição do problema e do impacto potencial;
- passos para reproduzir (PoC, se houver);
- versão/branch afetada.

Você receberá uma confirmação e acompanhará a correção até a divulgação coordenada.

## Escopo

Têm prioridade alta relatos envolvendo:

- autenticação e autorização (bypass de RBAC, escalonamento de papel/permissão);
- vazamento de dados pessoais ou sensíveis;
- exposição de secrets/credenciais.

## Boas práticas no desenvolvimento

- **Nunca** commite secrets (chaves, senhas, `DATABASE_URL` real). Use variáveis de ambiente;
  o inventário de secrets fica em [`docs/ops/`](./docs/ops/) (sem os valores) e o template em
  [`.env.example`](./.env.example).
- Senhas somente como **hash**.
- Specs de features com impacto de segurança vivem em
  [`docs/features/seguranca/`](./docs/features/seguranca/).
