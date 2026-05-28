import './globals.css'
import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'Oraculo d20',
  description: 'Plataforma de RPG online com Mestre IA'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-6 container">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
