'use client'

import Link from 'next/link'
import React from 'react'
import { useAuth } from '../lib/useAuth'

export default function Header() {
  const { user, signOut, loading } = useAuth()

  return (
    <header className="header-shadow glass tavern-bar">
      <div className="container flex flex-wrap items-center justify-between py-4 relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="guild-logo flex items-center justify-center text-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15 8l6 1-4.5 4 1 6L12 16l-7.5 3 1-6L1 9l6-1 3-6z" fill="currentColor" opacity="0.95" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold title-cinematic tracking-[0.08em]">Oraculo d20</div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted">Taverna do Mestre Arcano</div>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className="nav-pill">Dashboard</Link>
          <Link href="/create-campaign" className="nav-pill">Criar campanha</Link>
          <Link href="/create-character" className="nav-pill">Criar personagem</Link>
          {user ? (
            <>
              <span className="text-sm text-muted ml-2">{user.email}</span>
              <button disabled={loading} onClick={() => signOut()} className="nav-pill bg-red-700/80 text-white hover:bg-red-600/90">
                Sair
              </button>
            </>
          ) : (
            <Link href="/login" className="nav-pill bg-gradient-to-r from-arcane to-accent text-black shadow-sm">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
