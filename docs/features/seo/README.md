# SEO — robots.txt e sitemap.xml

O boilerplate gera `robots.txt` e `sitemap.xml` automaticamente via **metadata routes**
do Next.js — convenção de arquivo do App Router que compila TypeScript e serve o
resultado nos endpoints padrão (`/robots.txt`, `/sitemap.xml`). Crawlers e buscadores
leem texto/XML puro, sem saber que há código por baixo.

## Variável de ambiente necessária

```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

Defina em `.env.local` (dev) ou injete via infra (prod). Sem ela, os arquivos gerados
usam o placeholder `https://your-domain.com` — funciona, mas a URL no sitemap ficará
errada até a variável ser definida.

## robots.txt — `src/app/robots.ts`

Controla quais caminhos os crawlers podem ou não acessar.

**Comportamento padrão do boilerplate:**
- Permite tudo (`/`)
- Bloqueia `/admin`, `/api/` e `/private/`
- Aponta para o sitemap via `NEXT_PUBLIC_BASE_URL`

**Como ajustar:**
- Adicione ou remova entradas em `disallow` conforme as rotas do projeto.
- Para regras por bot específico (Googlebot, GPTBot etc.), adicione itens ao array
  `rules` — veja a [referência do Next.js](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md).

## sitemap.xml — `src/app/sitemap.ts`

Lista as URLs públicas que devem ser indexadas pelos buscadores.

**Comportamento padrão do boilerplate:**
- Inclui apenas a raiz (`/`) como ponto de partida.
- Ajuste `changeFrequency` e `priority` conforme a volatilidade de cada rota.

**Como expandir:**
```ts
// Rotas estáticas — adicione uma entrada por rota pública
{ url: `${baseUrl}/sobre`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },

// Rotas dinâmicas — busque do banco e mapeie
const posts = await db.post.findMany({ select: { slug: true, updatedAt: true } })
return posts.map(post => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: post.updatedAt }))
```

**Sitemaps grandes (>50 000 URLs):** use `generateSitemaps()` para dividir em múltiplos
arquivos — veja `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-sitemaps.md`.

## Verificação

Após subir o projeto, confirme os arquivos gerados:

```bash
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```
