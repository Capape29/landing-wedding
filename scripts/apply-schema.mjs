import pg from 'pg'
import { readFileSync } from 'node:fs'
process.loadEnvFile(process.argv[2] || '.cache/neon.env')
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
url.hostname = url.hostname.replace('-pooler.', '.')
url.searchParams.set('sslmode', 'verify-full')
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000 })
try {
  await client.connect()
  await client.query('BEGIN')
  await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
  await client.query('COMMIT')
  console.log('Schema applied')
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error(error.code || error.name); process.exitCode = 1
} finally { await client.end() }
