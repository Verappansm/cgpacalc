'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Calculator, TrendingUp, Target, BarChart3, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, type TabId } from '@/lib/constants'

const ICONS = { Calculator, TrendingUp, Target, BarChart3 }

function Sidebar({ active }: { active: TabId }) {
  const router = useRouter()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r border-border bg-sidebar z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border/60">
        <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-primary text-xs font-black">G</span>
        </div>
        <span className="font-bold text-sm tracking-tight">VIT GPA</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = ICONS[item.icon as keyof typeof ICONS]
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => router.push(`/app?tab=${item.id}`)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              {item.id === 'analytics' && (
                <span className="ml-auto text-[10px] font-semibold bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">
                  soon
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to home
        </Link>
      </div>
    </aside>
  )
}

function MobileNav({ active }: { active: TabId }) {
  const router = useRouter()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t border-border bg-sidebar/95 backdrop-blur-md">
      {NAV_ITEMS.map(item => {
        const Icon = ICONS[item.icon as keyof typeof ICONS]
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => router.push(`/app?tab=${item.id}`)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('size-5', isActive && 'text-primary')} />
            <span className="hidden xs:block">{item.label.split(' ')[0]}</span>
          </button>
        )
      })}
    </nav>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const active = (searchParams.get('tab') ?? 'gpa') as TabId

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={active} />
      <MobileNav active={active} />

      {/* Content */}
      <main className="md:pl-56 pb-20 md:pb-0 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border/60 bg-background/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {NAV_ITEMS.find(n => n.id === active)?.label}
            </span>
            {active === 'analytics' && (
              <span className="text-[10px] font-semibold bg-secondary rounded-full px-2 py-0.5 text-muted-foreground border border-border">
                COMING SOON
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">VIT Chennai · 10-pt scale</span>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}
