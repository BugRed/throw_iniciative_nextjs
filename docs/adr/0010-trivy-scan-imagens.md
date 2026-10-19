# ADR 0010 — Trivy como gate de vulnerabilidade nas imagens de deploy

**Status:** Aceito · 2026-10-08

## Contexto

O pipeline de deploy (`.github/workflows/deploy.yml`) builda e publica duas imagens
Docker (app e Prisma/migrations) e as leva direto para produção via k3s. Até aqui,
nada no pipeline valida o conteúdo dessas imagens além dos checks de código
(format, typecheck, lint, testes) — uma dependência de base com CVE conhecida
(ou uma imagem base abandonada, como aconteceu com o MinIO, ver ADR-0009) chegaria
em produção sem nenhum alerta.

As opções consideradas:

- Scanner de SO/pacotes na imagem publicada (Trivy, Grype, Docker Scout) — cobre
  exatamente o que vai para produção.
- Scanner de dependências de código (`yarn audit`, Dependabot) — já existe via
  Dependabot/GitHub, mas não enxerga a imagem base nem pacotes de SO instalados
  no Dockerfile.
- Scan manual/ocasional — não escala e não bloqueia nada automaticamente.

Trivy foi escolhido por ser open-source, não exigir conta/token externo para scans
básicos, rodar bem em Actions via `aquasecurity/trivy-action` mantida pelo próprio
projeto, e cobrir tanto pacotes de SO quanto dependências de linguagem na mesma
imagem.

## Decisão

Cada imagem publicada em `deploy.yml` é escaneada pelo Trivy logo após o
`build-push-action` que a publica — uma no job `build-app` (imagem da aplicação),
outra no job `build-prisma` (imagem de migrations). O step roda sobre a tag de SHA
já publicada no registry (não exige `--load` da imagem local) e falha o job em
`CRITICAL`/`HIGH` (`exit-code: "1"`), com `ignore-unfixed: true` — CVE sem fix
disponível ainda não é algo que a equipe pode agir sobre, então não bloqueia o
deploy.

Como os jobs `migrate` e `rollout` dependem de `build-app`/`build-prisma`, uma
imagem reprovada no Trivy nunca chega a ser aplicada em produção — o scan é gate,
não relatório.

## Consequências

- ➕ Imagem com CVE corrigível HIGH/CRITICAL nunca chega a produção — reprova no
  CI, antes do `migrate`/`rollout`.
- ➕ Mesmo padrão de gate usado para validar a imagem do object storage de dev
  (ADR-0009) — consistente em todo o projeto.
- ➖ Um CVE novo publicado para uma dependência/imagem base já em produção pode
  travar o próximo deploy até a correção — é o comportamento esperado de um
  gate, mas exige que a equipe saiba agir (hotfix de dependência) quando acontecer.
- ⚠️ `ignore-unfixed: true` significa que CVEs sem patch disponível não bloqueiam
  — revisitar se o projeto precisar de um padrão mais rígido (ex.: compliance que
  exija listar também os sem fix).
- ⚠️ O scan roda só no `deploy.yml` (push em `main`), não em PR — uma imagem só é
  escaneada quando já é candidata a ir para produção. Se o time quiser feedback
  mais cedo, adicionar o mesmo step a um workflow de PR é o próximo passo natural,
  não uma mudança neste ADR.
