'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/vendors', label: 'Vendor CRM' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/5 bg-void lg:flex">
      <div className="p-6">
        <span className="font-display text-lg font-bold text-pulse">Ówàmbẹ̀</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-pulse/10 text-pulse'
                : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <form action="/api/auth/signout" method="POST">
          <button className="w-full rounded-lg px-4 py-2 text-left text-sm text-foreground/40 hover:text-foreground/70 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
