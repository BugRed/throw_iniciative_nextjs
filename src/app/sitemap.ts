import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://your-domain.com'

  // Adicione aqui todas as rotas públicas que devem ser indexadas.
  // Para sitemaps grandes (>50 000 URLs), use generateSitemaps() — ver docs:
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-sitemaps.md
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
  ]
}
