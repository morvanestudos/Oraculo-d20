import Link from 'next/link'
import React from 'react'

export default function Sidebar() {
  return (
    <aside className="w-64 hidden lg:block sidebar-scroll glass min-h-screen p-4">
      <div className="space-y-6">
        <div className="text-xs text-muted uppercase tracking-[0.2em]">Menu do Salão</div>
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className="sidebar-entry">
            <svg className="w-5 h-5 text-arcane" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18"/></svg>
            <span>Mapa dos Reinos</span>
          </Link>
          <Link href="/create-campaign" className="sidebar-entry">
            <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
            <span>Crônicas da Jornada</span>
          </Link>
          <Link href="/create-character" className="sidebar-entry">
            <svg className="w-5 h-5 text-magicblue" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-1c0-2.21 3.582-4 6-4s6 1.79 6 4v1H6z"/></svg>
            <span>Salão dos Heróis</span>
          </Link>
        </nav>

        <div className="mt-6 text-xs text-muted">
          <div>Conectado como <span className="font-medium">Mestre</span></div>
        </div>
      </div>
    </aside>
  )
}
