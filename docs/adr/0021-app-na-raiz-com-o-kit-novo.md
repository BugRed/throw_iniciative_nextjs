# ADR 0021 — O app mora na raiz do repo; o kit novo prevalece sobre o do boilerplate

**Status:** Aceito · 2026-10-18

## Contexto

O produto nasce de duas fontes: o `Next-Project-Boilerplate` (repo próprio, com histórico e
remote de terceiros, kit de processo antigo e ADRs 0001–0010 sobre ferramentas) e o kit
fh-estado instalado na raiz do repo `throw_iniciative` (hooks de estado, `/feature`,
`/fechar`, ADRs de processo). Dois kits no mesmo repo = dois CLAUDE.md, dois fluxos de
feature e dois conjuntos de ADR com numeração conflitante (0009–0010 duplicados).

## Decisão

O aplicativo vive **na raiz do repo** `throw_iniciative`: o conteúdo do boilerplate é copiado
para cá sem o `.git` dele. O **kit novo prevalece**: `.claude/`, `CLAUDE.md`, `AGENTS.md`,
`PROGRESS.md` e `docs/features/TEMPLATE.md` da raiz substituem os do boilerplate (o fluxo
`/continue` → `/feature`+hooks). Os ADRs de ferramentas do boilerplate (0001–0010) são
mantidos — continuam verdade para o código que veio deles — e os ADRs do kit são renumerados
para **0011–0020**. ADRs novos do produto começam em 0021. Os diretórios `Next-Project-Boilerplate/`
e `fh-kit-estado/` ficam na árvore como referência e fora do versionamento (`.gitignore`).

## Alternativas rejeitadas

- **Desenvolver dentro do repositório do boilerplate:** carrega histórico e remote de
  terceiros (`fhdataanalysis-projects`) que não são nossos; push seria para o repo errado.
- **Repo limpo sem boilerplate:** recriar Docker, CI, lint de boundaries, ratchet de cobertura
  e Sonar do zero é custo puro — o valor do template é exatamente essa base.
- **Manter os dois kits:** dois fluxos de feature no mesmo repo divergem na primeira sessão;
  o kit novo foi instalado na raiz de propósito (decisão do usuário ao referenciá-lo).

## Consequências

- ➕ Um repo, um kit, um fluxo de feature; ADRs sem colisão cobrindo ferramenta e processo.
- ➕ O histórico limpo do repo raiz começa com a baseline do produto, não com o template.
- ➖ Perde-se o histórico git do boilerplate — mitigado pelo diretório de referência intacto
  e pelos ADRs 0001–0010 que preservam o porquê das ferramentas.
- ⚠️ Referências cruzadas a números antigos de ADR do kit (ninguma encontrada além do cache
  do hook, regenerado); se um link quebrado aparecer, aponta para 0011–0020.
