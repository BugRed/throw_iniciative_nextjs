import '@/app/globals.css'

import type { Metadata } from 'next'
import { Cinzel, Geist, Geist_Mono, Lora } from 'next/font/google'

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
})

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Throw Iniciative',
  description:
    'Rastreamento de iniciativa para mesas de D&D 5.5E: fila em tempo real, dados rolados no servidor e timer com passe automático.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${cinzel.variable} ${lora.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
