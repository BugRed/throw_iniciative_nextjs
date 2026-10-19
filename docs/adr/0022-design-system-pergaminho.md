# ADR 0022 — A linguagem visual é o Pergaminho, extraído de Os Últimos Dias de Glória

**Status:** Aceito · 2026-10-18

## Contexto

O produto precisa de identidade visual própria antes das fases de UI (auth, wizard,
tracker). O usuário definiu a direção: design criado do zero **com base no site Os Últimos
Dias de Glória** (campanha de Forgotten Realms, Salvador-BA) — um site de mesa clássico
dos anos 2000: papel-pergaminho claro, tinta escura, vinho profundo (#990033), ouro velho,
menu/banner de couro escuro com texto dourado e serifadas de livro (Georgia/Book Antiqua).
O plano original deste agente propunha um tema dark ("Taverna"); o usuário escolheu a
referência real.

## Decisão

O design system chama-se **Pergaminho**: tema claro de papel (textura só em CSS — nenhum
arquivo de imagem copiado do site), com superfícies locais de couro escuro para destaque.
Tokens vivem no `@theme` do `globals.css` (Tailwind 4, sem arquivo de config); a referência
de uso é [`docs/design/design-system.md`](../design/design-system.md). Tipografia: Cinzel
(display), Lora (corpo), Geist Sans (controles), Geist Mono (números, `tabular-nums`).

## Alternativas rejeitadas

- **"Taverna" (dark-first), proposta inicial do plano:** substituída pela escolha explícita
  do usuário pela referência do site — dark permanece só nas superfícies de couro.
- **shadcn/ui:** traz o sistema visual neutro do Radix; nada tem a ver com a linguagem
  pedida, e o CLI/estrutura não conversam com a arquitetura atoms→molecules→organisms do kit.
- **Copiar as imagens do site (bgpergaminho.jpg etc.):** além do direito de uso, texturas em
  CSS são mais leves, escalam e não prendem o app a arquivos estáticos alheios.

## Consequências

- ➕ Identidade única e coerente com o gosto do usuário; tokens documentados com origem.
- ➕ Zero dependência de assets externos; textura e ruído são CSS puro.
- ➖ Manutenção consciente de contraste: `gold-300` só sobre couro, ouro nunca como texto
  sobre papel (corrói a leitura).
- ⚠️ Tema escuro alternativo não existe por design; se um dia for pedido, nasce como
  variantes dos tokens — não como cópia das classes.
