# Regras de negócio

Este diretório versiona as **regras de negócio** do produto — *o que* o sistema deve fazer e
*por quê*, independente de como está implementado. Elas mudam junto com o produto, então vivem
no repositório (revisadas em PR, com histórico no `git`), e **não** em documento institucional
à parte.

- **Uma regra por arquivo**, agrupada por domínio.
- Cada regra é a **fonte da verdade** daquele comportamento. O [`contexto.md`](../contexto.md)
  dá a visão geral e **aponta** para cá; não duplique o enunciado nos dois lugares.
- Ao mudar uma regra, atualize o arquivo **no mesmo PR** que muda o código.

## Formato de cada regra

```markdown
# <Nome da regra>

**Status:** vigente | proposta | revogada
**Domínio:** <auth / conteúdo / cobrança / ...>

## Enunciado
A regra em si, de forma inequívoca.

## Racional
Por que ela existe (a dor / objetivo que justifica).

## Casos de borda
Situações-limite e o que acontece em cada uma.

## Onde é aplicada
Arquivo(s)/camada que fazem valer a regra (link para o código — normalmente um `service`).

## Decisões em aberto
O que ainda não foi decidido.
```

## Índice

| Regra | Domínio | Status |
|---|---|---|
| _(nenhuma ainda — crie a primeira a partir do formato acima)_ | | |
