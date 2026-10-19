# Roadmap

Fases do MVP 1, derivadas de [`plano.md`](./plano.md) (fonte completa, com dependências e
critérios). Estado vivo de cada fase mora na spec em `docs/features/` — aqui é só o mapa.

Legenda: ✅ entregue · 🚧 em andamento · ⏳ na fila · 💡 pós-MVP

## MVP 1

| Fase | Entrega | Estado |
|---|---|---|
| P0 | Fundação: boilerplate + kit fundidos, rename, gates | ✅ |
| P1 | Design system Pergaminho (tokens, fontes, componentes base) | ✅ |
| P2 | Better Auth: e-mail/senha + verificação + Discord opcional | ⏳ |
| P3 | Schema Prisma de domínio completo | ⏳ |
| P4 | Importação do SRD 5.2 (CC-BY) | ⏳ |
| P5 | CRUD de personagem (wizard de criação) | ⏳ |
| P6 | NPCs: templates leves + NPC completo | ⏳ |
| P7 | Salas, membership e tempo real (SSE) | ⏳ |
| P8 | Núcleo de iniciativa (state machine + dado server-side) | ⏳ |
| P9 | UX de iniciativa (fila, vez, passar, adicionar, finalizar) | ⏳ |
| P10 | Timer autoritativo + passe automático | ⏳ |
| P11 | Notificações sonoras e visuais | ⏳ |
| P12 | Hardening de segurança (rate limit, auditoria, exclusão de conta) | ⏳ |
| P13 | E2E do fluxo crítico + empacotamento para produção | ⏳ |

## Pós-MVP (💡)

- Deploy real (domínio, cron gerenciado, Redis para rate limit e EventBus multi-instância)
- Provedor de e-mail transacional real
- Sentry/observabilidade de produto, PWA, tema claro/escuro alternativo
