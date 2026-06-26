'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="flex-1 ml-64 mt-16 p-8">
        <div className="max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
