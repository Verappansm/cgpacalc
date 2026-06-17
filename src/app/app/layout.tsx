'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Calculator, TrendingUp, Target, BarChart3, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, type TabId } from '@/lib/constants'
import { VtopConnect, VtopStatusBadge } from '@/components/vtop-connect'
import { ThemeToggle } from '@/components/theme-provider'

const ICONS = { Calculator, TrendingUp, Target, BarChart3 }

function Sidebar({ active, onOpenVtop }: { active: TabId; onOpenVtop: () => void }) {
  const router = useRouter()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r border-border bg-sidebar z-20">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border/60">
        <span className="text-sm tracking-tight select-none">
          <span className="font-semibold text-foreground/70">VIT</span><span className="font-black text-primary">GPA</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 space-y-2">
        <VtopStatusBadge onClick={onOpenVtop} />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5 shrink-0" /> Back to home
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function MobileNav({ active, onOpenVtop }: { active: TabId; onOpenVtop: () => void }) {
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
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('size-5', isActive && 'text-primary')} />
            <span className="hidden xs:block">{item.label.split(' ')[0]}</span>
          </button>
        )
      })}
      <button
        onClick={onOpenVtop}
        className="md:hidden flex-none flex flex-col items-center gap-1 py-3 px-3 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>
        <span className="hidden xs:block">VTOP</span>
      </button>
    </nav>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const active = (searchParams.get('tab') ?? 'gpa') as TabId
  const [showVtop, setShowVtop] = useState(() => searchParams.get('vtop') === 'open')

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={active} onOpenVtop={() => setShowVtop(true)} />
      <MobileNav active={active} onOpenVtop={() => setShowVtop(true)} />

      {/* Content */}
      <main className="md:pl-56 pb-20 md:pb-0 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border/60 bg-background/90 backdrop-blur-md px-4 md:px-6">
          <span className="font-semibold text-sm">
            {NAV_ITEMS.find(n => n.id === active)?.label}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              VIT Chennai · 10-pt scale
            </span>
            <ThemeToggle />
          </div>
        </header>

        <div className="max-w-[700px] mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>

      <AnimatePresence>
        {showVtop && <VtopConnect onClose={() => setShowVtop(false)} />}
      </AnimatePresence>
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
