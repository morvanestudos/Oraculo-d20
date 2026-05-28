'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { user, signIn, signUp, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Informe email e senha.')
      return
    }

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (result) {
      setError(result.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-[#071018] rounded-xl border border-[rgba(255,255,255,0.08)] shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">{mode === 'login' ? 'Entrar' : 'Cadastrar'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Senha</label>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2"
            placeholder="Senha"
          />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-gradient-to-r from-arcane to-accent text-black font-semibold"
        >
          {mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
      <div className="mt-4 text-sm text-muted">
        {mode === 'login' ? (
          <>
            Não tem conta?{' '}
            <button type="button" onClick={() => setMode('register')} className="underline">
              Cadastre-se
            </button>
          </>
        ) : (
          <>
            Já tem conta?{' '}
            <button type="button" onClick={() => setMode('login')} className="underline">
              Entrar
            </button>
          </>
        )}
      </div>
      <div className="mt-4 text-xs text-muted">
        <p>Suporte Supabase adicionado como camada adicional. O localStorage continua ativo.</p>
      </div>
    </div>
  )
}
