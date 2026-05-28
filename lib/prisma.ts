import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // allow global var during development to avoid multiple instances
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable for Prisma adapter initialization.')
}

const prismaAdapter = new PrismaPg(databaseUrl)
export const prisma = global.prisma ?? new PrismaClient({ adapter: prismaAdapter })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
