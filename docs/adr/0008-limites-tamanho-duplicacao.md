# ADR 0008 — Limites de tamanho de função/arquivo e piso de duplicação

**Status:** Aceito · 2026-10-06

## Contexto

Código gerado por agente de IA tende a crescer em funções e arquivos maiores do que um
humano normalmente escreveria numa sentada — e duplicação (um bloco de lógica copiado em vez
de extraído) é um smell particularmente fácil de reintroduzir quando quem escreve não carrega
o histórico completo do arquivo na cabeça. Nenhuma ferramenta do pipeline atual (Prettier,
ESLint, `tsc`, Vitest) travava isso: o único lugar que pegaria uma função gigante ou código
duplicado era o SonarQube (`yarn sonar`/`sonar:scan`), que roda depois, via container, e cujo
Quality Gate (`sonar/setup.sh`) não tinha nenhuma condição de duplicação configurada
(`duplicated_lines_density` não estava na lista de `add_condition`).

As opções eram: (a) confiar só no SonarQube — feedback tardio, só aparece depois de subir o
container; (b) travar tudo via regra de ESLint — rápido e local, mas ESLint não enxerga
duplicação entre arquivos de um projeto inteiro, só dentro de cada arquivo analisado; (c) as
duas camadas juntas — ESLint para feedback instantâneo (já roda no `yarn lint` e no
pre-commit via Husky/lint-staged — ADR-0004) e o Quality Gate do Sonar como rede de segurança
em nível de projeto inteiro.

## Decisão

Usaremos as duas camadas:

- **ESLint** (`eslint.config.mjs`), escopo `src/**/*.{ts,tsx}`:
  - `max-lines-per-function`: 50 linhas (sem contar comentário/linha em branco).
  - `max-lines`: 300 linhas por arquivo (500 para `*.test.ts(x)`/`*.spec.ts(x)` — teste
    legitimamente enumera muitos casos, ver `/criar-testes`).
  - `eslint-plugin-sonarjs` (`no-identical-functions`, `no-duplicate-string`) — as mesmas
    regras que o SonarQube aplicaria no scan completo, rodando local sem esperar o container.
- **SonarQube Quality Gate** (`sonar/setup.sh`): condição nova `duplicated_lines_density GT 3`
  — falha o gate acima de 3% de linhas duplicadas em todo o projeto, pegando duplicação entre
  arquivos que o ESLint (por arquivo) não vê.

Os números (50 / 300 / 3%) foram escolhidos deliberadamente apertados — o objetivo é forçar
decomposição cedo, não acomodar o que já existe. Um arquivo/função que bate no limite é sinal
de que algo deveria virar outra função, outro arquivo, ou (no caso de UI) descer um nível no
Atomic Design.

## Consequências

- ➕ Função e arquivo grandes demais, ou duplicação óbvia, viram erro de lint local — pego
  antes do commit (Husky) e antes de abrir PR, sem depender do Sonar estar no ar.
- ➕ `duplicated_lines_density` no Quality Gate cobre o que o ESLint estruturalmente não
  alcança: duplicação espalhada entre arquivos diferentes.
- ➕ Dogfooding imediato: a própria página de boas-vindas do boilerplate
  (`src/app/(app)/page.tsx`) violava `max-lines-per-function` (123 linhas numa função só) e
  foi decomposta em seções menores como parte desta mudança.
- ➖ Função legitimamente complexa (ex.: um fluxo de validação com muitos `if` de regra de
  negócio) pode precisar de decomposição só para caber no limite, mesmo quando a decomposição
  não deixa o código mais claro — nesse caso, avalie se vale um comentário justificando ou se
  o limite por arquivo/função não é o lugar certo para aquela regra especificamente.
- ⚠️ Esta mudança expôs um bug de idempotência em `start.sh`/`scan.sh`: os dois só chamavam
  `setup.sh` quando o Quality Gate "Boilerplate Gate" **não existia ainda**, então uma condição
  nova (como `duplicated_lines_density`) nunca chegava em quem já tinha o gate criado antes
  dela existir. Corrigido na mesma mudança: `setup.sh` agora roda sempre, em todo `yarn sonar`
  e `yarn sonar:scan` — ele já era idempotente por conta própria (só cria o gate se faltar, e
  repetir uma condição existente é no-op), então rodar sempre é só reconciliar o gate com o que
  este script descreve, sem custo perceptível (poucas chamadas de API).
- ⚠️ Rodar `setup.sh` sempre (item acima) expôs um segundo bug, pré-existente: a detecção de
  senha do admin testava `/api/system/status` — endpoint público, responde 200 com qualquer
  credencial — então sempre "detectava" a senha padrão `admin:admin` e tentava trocá-la de
  novo, falhando com 401 toda vez que a senha já tinha sido trocada numa execução anterior.
  Corrigido trocando para `/api/qualitygates/list` (exige autenticação real).
- ⚠️ Rodar o scan de verdade (pra validar `duplicated_lines_density`) revelou que o perfil de
  qualidade CSS padrão do Sonar (`Sonar way`) não reconhece at-rules do Tailwind CSS v4
  (`@theme`, usada pelo setup padrão do Next.js 16) — reporta como bug e derruba o
  `reliability_rating`, travando o Quality Gate por um falso positivo sem relação com esta
  decisão. `NOSONAR` inline não suprime esse tipo de issue neste analisador. Corrigido criando
  o perfil `Boilerplate Way` (cópia do `Sonar way` com o parâmetro `ignoreAtRules` da regra
  `css:S4662` estendido para os at-rules do Tailwind v4) e definindo-o como padrão para CSS
  nesta instância do Sonar.
