export const DATABASE_URL = process.env.DATABASE_URL ?? ''

export function getEnv(key: string, fallback = '') {
  return process.env[key] ?? fallback
}
