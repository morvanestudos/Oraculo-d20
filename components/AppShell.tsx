'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'

// Routes that render full-screen without header/sidebar
const FULL_SCREEN_ROUTES = ['/login']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullScreen = FULL_SCREEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (isFullScreen) return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 container">{children}</main>
      </div>
    </div>
  )
}
