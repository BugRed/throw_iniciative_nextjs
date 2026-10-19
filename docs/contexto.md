# Contexto do produto

> Onboarding de contexto: o que qualquer pessoa que entra no time precisa saber e que **não**
> está no código. Produto, personas, fluxos e glossário. O detalhe técnico mora nos
> [ADRs](./adr/), no [modelo de dados](./db/modelo-de-dados.md) e no [`plano.md`](../plano.md).

## 1. O que é a plataforma e que problema resolve

**Throw Iniciative** é um rastreador de iniciativa para mesas de D&D 5.5E, presencial ou
online. A dor: controlar ordem de iniciativa com papel e planilha é lento, gera disputa
("quem rolou mais?") e ninguém sabe de quem é a vez depois de dez minutos de combate.

O produto resolve com: fila de iniciativa compartilhada em tempo real (mestre e jogadores
veem a mesma ordem), rolagem de d20 **no servidor** (auditoria, sem dado viciado), desempate
pela regra oficial (total → modificador → re-rolagem), timer por turno com passe automático
e avisos sonoros/visuais de "é a sua vez" e "prepare-se".

Quem usa: grupos de RPG amadores — o **mestre** organiza a mesa; os **jogadores** entram por
um código de 6 caracteres e acompanham a fila do próprio celular/notebook.

## 2. Personas e permissões

| Papel | O que enxerga | O que pode fazer |
|---|---|---|
| Visitante | Landing | Criar conta, entrar |
| Jogador (membro de sala) | Fila, membros da sala, própria ficha; ficha alheia só se o dono permitir | Rolar a própria iniciativa, passar a própria vez, escolher PJ ativo |
| Mestre (dono da sala) | Tudo da sala + auditoria de rolagens | Disparar iniciativa, rolar NPCs, adicionar/remover participantes, pausar timer, configurar sala e som, finalizar iniciativa |

## 3. Fluxos principais

1. **Entrar na mesa** — mestre cria sala (código 6 chars) → jogadores entram com o código →
   cada jogador seleciona seu PJ ativo (um por sala).
2. **Combate** — mestre seleciona participantes e dispara iniciativa → cada jogador rola d20
   (mestre rola todos os NPCs num clique) → fila ordenada com desempate oficial → vez passa
   manualmente ou por timeout → próximo é avisado (som + visual).
3. **Ficha** — jogador monta personagem pelo wizard (espécie → classe → … → revisão) com
   cálculo automático de HP/CA/modificador de iniciativa; mestre cria NPCs completos ou
   modelos leves reutilizáveis (ex.: "Goblin" ×4).

## 4. Domínios funcionais

- **Identidade** — contas, sessões, verificação de e-mail, Discord OAuth.
- **SRD** — dados de referência do SRD 5.2 (CC-BY 4.0): espécies, classes, magias etc.
- **Personagens** — fichas de PJ e NPC completo; modelos de NPC leve.
- **Salas** — sala, membership, seleção de PJ, NPCs temporários.
- **Iniciativa** — state machine do combate, rolagem server-side, fila, timer.
- **Plataforma** — notificações, auditoria, rate limit.

## 5. Arquitetura (visão macro)

Next 16 (App Router) · mutações via Server Actions → controller → service · leituras via RSC ·
Prisma + Postgres · tempo real por SSE (broker em processo) · timer autoritativo no servidor
(endpoint de cron + scheduler local) · storage S3 (SeaweedFS em dev) para som e avatar ·
design system próprio "Pergaminho" (Tailwind 4). Detalhes e porquês nos ADRs.

## 6. Glossário

| Termo | Significado |
|---|---|
| Iniciativa | Ordem de ação no combate: d20 + modificador de DES |
| PJ / PC | Personagem do jogador |
| NPC | Personagem do mestre — completo (ficha) ou temporário (modelo × quantidade) |
| Sala (room) | Uma mesa de jogo, com código de entrada de 6 caracteres |
| Mestre | Dono da sala; autoridade sobre iniciativa e configuração |
| SRD 5.2 | System Reference Document do D&D 5.5E, conteúdo licenciado CC-BY 4.0 |
| Desempate oficial | Total → modificador de iniciativa → re-rolagem até desempatar |
| Passe automático | Vez passa sozinha quando o timer do turno expira |

## Atribuição de conteúdo

Espécies, classes, magias, equipamentos, monstros e demais regras de referência vêm do
**System Reference Document 5.2** © Wizards of the Coast, licenciado sob
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). A cópia consumida pelo produto é o
JSON do repo [5e-bits/5e-database](https://github.com/5e-bits/5e-database) (pasta 2024),
baixado por `yarn srd:fetch` com commit pinado e importado pelo seeder. A atribuição
aparece no rodapé da landing.
