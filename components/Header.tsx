'use client'

import Link from 'next/link'
import React from 'react'
import { useAuth } from '../lib/useAuth'

function D20Icon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer pentagon/dodecahedron silhouette */}
      <polygon
        points="13,1 24,8 24,18 13,25 2,18 2,8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* Inner triangle — d20 face detail */}
      <polygon
        points="13,5 20,16 6,16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.65"
      />
      {/* Center dot — "20" suggestion */}
      <circle cx="13" cy="13" r="1.5" fill="currentColor" opacity="0.8" />
      {/* Side facets */}
      <line x1="13" y1="5" x2="13" y2="1" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="16" x2="2" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="16" x2="24" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

export default function Header() {
  const { user, signOut, loading } = useAuth()

  return (
    <header className="header-shadow tavern-bar" style={{
      borderBottom: '1px solid rgba(212,177,106,0.18)',
    }}>
      <div className="container flex flex-wrap items-center justify-between py-3 relative z-10">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="guild-logo flex items-center justify-center text-gold"
            style={{
              boxShadow: '0 0 14px rgba(212,177,106,0.22), inset 0 0 8px rgba(212,177,106,0.06)',
              transition: 'box-shadow 0.3s',
            }}
          >
            <D20Icon />
          </div>
          <div>
            <div
              className="title-cinematic tracking-[0.1em]"
              style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e8d4a0', lineHeight: 1.2 }}
            >
              Oraculo d20
            </div>
            <div style={{
              fontSize: '0.62rem',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              color: 'rgba(212,177,106,0.55)',
              letterSpacing: '0.06em',
              lineHeight: 1,
              marginTop: 2,
            }}>
              Toda lenda começa com uma escolha.
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className="nav-pill">Mesa</Link>
          <Link href="/create-character" className="nav-pill">Personagem</Link>
          <Link href="/create-campaign" className="nav-pill">Campanha</Link>
          {user ? (
            <>
              <span className="text-xs text-muted ml-1" style={{ opacity: 0.6 }}>{user.email}</span>
              <button
                disabled={loading}
                onClick={() => signOut()}
                className="nav-pill"
                style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.4rem 1rem',
                background: 'linear-gradient(135deg, rgba(148,96,20,0.85), rgba(90,54,8,0.80))',
                border: '1px solid rgba(212,177,106,0.4)',
                borderRadius: '9999px',
                color: '#f2e2a8',
                fontSize: '0.8rem',
                fontFamily: 'Cinzel, serif',
                letterSpacing: '0.06em',
                fontWeight: 600,
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
