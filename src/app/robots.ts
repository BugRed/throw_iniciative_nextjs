import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://your-domain.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Bloqueie rotas que não devem ser indexadas por crawlers.
        disallow: ['/api/', '/dashboard', '/characters', '/rooms', '/settings'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
