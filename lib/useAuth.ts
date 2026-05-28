'use client'

import { useEffect, useState } from 'react'

type User = { email: string }

const STORAGE_KEY = 'oraculo_d20_users'
const SESSION_KEY = 'oraculo_d20_session'

function readUsers(): Record<string, { password: string; email: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeUsers(users: Record<string, { password: string; email: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      const session = raw ? JSON.parse(raw) : null
      setUser(session?.user ?? null)
    } catch {
      setUser(null)
    }
    setLoading(false)
  }, [])

  async function signIn(email: string, password: string) {
    setLoading(true)
    try {
      const users = readUsers()
      const record = users[email]
      if (!record || record.password !== password) {
        setLoading(false)
        return { message: 'Email ou senha inválidos.' }
      }
      const user = { email }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }))
      setUser(user)
      setLoading(false)
      return null
    } catch (e) {
      setLoading(false)
      return { message: 'Erro ao realizar login.' }
    }
  }

  async function signUp(email: string, password: string) {
    setLoading(true)
    try {
      const users = readUsers()
      if (users[email]) {
        setLoading(false)
        return { message: 'Já existe uma conta com esse email.' }
      }
      users[email] = { email, password }
      writeUsers(users)
      const user = { email }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }))
      setUser(user)
      setLoading(false)
      return null
    } catch (e) {
      setLoading(false)
      return { message: 'Erro ao criar conta.' }
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      localStorage.removeItem(SESSION_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, signIn, signUp, signOut }
}
