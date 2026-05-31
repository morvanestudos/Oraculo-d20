import './globals.css'
import React from 'react'
import AppShell from '../components/AppShell'

export const metadata = {
  title: 'Oraculo d20',
  description: 'Plataforma de RPG online com Mestre IA'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
