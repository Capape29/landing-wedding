import pg from 'pg'
import { attachDatabasePool } from '@vercel/functions'
let pool
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured')
  if (!pool) {
    const connection = new URL(process.env.DATABASE_URL)
    connection.searchParams.set('sslmode', 'verify-full')
    pool = new pg.Pool({ connectionString: connection.toString(), max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000, statement_timeout: 8000 })
    attachDatabasePool(pool)
  }
  return pool
}

export async function transaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}
