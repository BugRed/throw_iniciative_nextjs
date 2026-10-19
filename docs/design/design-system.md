# Design system "Pergaminho"

Referência viva da linguagem visual do Throw Iniciative. Os tokens moram no `@theme` de
[`src/app/globals.css`](../../src/app/globals.css) — este documento diz **quando usar cada
peça**; o hex exato sempre volta ao código. Origem: extraída do site *Os Últimos Dias de
Glória* (campanha de Forgotten Realms, Salvador-BA) a pedido do usuário — ver
[ADR-0022](../adr/0022-design-system-pergaminho.md).

## Princípios

1. **Papel claro, couro para destacar.** A página é pergaminho; superfícies escuras de
   couro reservam-se a banner, painel do tracker e menus — o contraste da "mesa na noite".
2. **Vinho é assinatura, ouro é ornamento.** Vinho `wine-500` para ação e título de seção;
   ouro para moldura, divisor e texto sobre couro. Ouro não é cor de ação sobre papel.
3. **Serifa conta história, sans opera.** Cinzel apresenta (logo, título de página), Lora
   narra (corpo, ficha), Geist Sans opera (formulário, botão), Geist Mono conta (dado,
   modificador, countdown — sempre `tabular-nums`).
4. **Sem imagem de textura.** Pergaminho é CSS (gradientes + ruído SVG inline). Nada de
   jpg de papel — mantém o app leve e themable.

## Tokens (resumo)

| Família | Token principal | Uso |
|---|---|---|
| `paper-50…500` | `paper-100` (fundo), `paper-50` (card) | superfícies de papel; `400/500` são a borda envelhecida |
| `ink-900/700/500/400` | `ink-900` texto | tinta; `ink-400` é o tom de link do site de referência |
| `wine-400/500/600` | `wine-500` `#990033` | ação primária, título, destaque — a cor do produto |
| `rubric-600` | `#990000` | rúbrica: título de matéria/erro de validação forte |
| `gold-300…800` | `gold-500` moldura | ornamento, borda, texto sobre couro (`gold-300`) |
| `leather-600/700/800` | `leather-800` | painéis escuros (header, tracker) |
| `moss-600` | sucesso | confirmação, status verde |
| `fire-500/600` | alerta | fim de timer, destrutivo |
| `suede-500` | crédito | rodapé, atribuição |
| `ash-400` | inativo | finalizado, desabilitado |

Fontes: `font-display` (Cinzel) · `font-serif` (Lora) · `font-sans` (Geist Sans) ·
`font-mono` (Geist Mono).

Movimento: `animate-pulse-vez` (pulso dourado do avatar da vez, 1,5s) ·
`animate-toast-entra` (slide 200ms). `prefers-reduced-motion` desliga tudo (globals.css).

## Catálogo

### Átomos (`src/shared/components/atoms/`)

| Componente | Quando usar | Observações |
|---|---|---|
| `Button` | toda ação clicável | variantes `primary` (vinho) / `secondary` (papel+contorno) / `ghost` / `danger` (fogo) / `gold` (CTA sobre couro); `href` transforma em `<Link>` |
| `Input` / `Textarea` | formulário | `rotulo` associa label; `erro` renderiza `role=alert` e `aria-invalid` |
| `Select` | escolha fechada | recebe `opcoes: {valor, rotulo}[]` |
| `Checkbox` | toggles | rótulo clicável por encapsulamento |
| `Badge` | selo de status | variantes wine/gold/moss/fire/ash/outline |
| `Card` | bloco de papel | moldura dourada sutil, `titulo` opcional em vinho |
| `Avatar` | participante | iniciais (Cinzel dourado sobre couro) com fallback; `src` para imagem |
| `DiceIcon` | dado | silhueta por `lados` (d4–d20), `role=img` com rótulo |
| `StatPill` | stat compacta | rótulo uppercase + valor mono |
| `CountdownText` | timer visível | mm:ss mono; `data-alerta=true` e cor fogo ≤ `limiteAlerta` (30s) |

### Moléculas (`src/shared/components/molecules/`)

| Componente | Quando usar |
|---|---|
| `OrnamentDivider` | fechar/separar seções do pergaminho (filete duplo + losango) |

### Por vir (nascem com a fase consumidora)

`QueueItem`/`QueueView` (P9), `CharacterCard`/`CharacterSheet`/`AbilityScoreInput`
(P5), `NpcTemplateCard` (P6), `MemberRow`/`RoomCodeField`/`LobbyPanel` (P7),
`StepIndicator` (P5), `Toast` (P11). Estados de turno (sua-vez/próximo/alerta) aplicam-se
no `QueueItem` com os keyframes já definidos.

## Acessibilidade

- Contraste: tinta sobre papel ≥ 12:1; ouro `gold-300` sobre couro ≥ 7:1; vinho sobre
  papel ≥ 7:1. Fogo é reservado a alerta com texto curto.
- Foco visível dourado em todo controle (`focus-visible:outline-gold-700`).
- Ícones de dado anunciam `dN` por `role=img`; avatar sem imagem é `aria-hidden` (o nome
  vem do contexto ao lado).
