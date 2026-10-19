import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <Link
        href="/"
        className="font-display text-xl font-bold tracking-wide text-wine-500 hover:text-wine-600"
      >
        Throw Iniciative
      </Link>
      {children}
    </main>
  )
}
