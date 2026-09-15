import pg from 'pg'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
process.loadEnvFile('.cache/neon.env')
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
url.hostname = url.hostname.replace('-pooler.', '.')
url.searchParams.set('sslmode', 'verify-full')
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000, statement_timeout: 15000 })
const ddl = readFileSync(new URL('../db/youtube.sql', import.meta.url), 'utf8')
try {
  await client.connect()
  await client.query('BEGIN')
  const schema = `youtube_check_${randomBytes(6).toString('hex')}`
  await client.query(`CREATE SCHEMA ${schema}`)
  await client.query(`SET LOCAL search_path TO ${schema}`)
  await client.query(ddl)
  await client.query(ddl) // Idempotency.
  await client.query('ROLLBACK')
  console.log('Isolated schema validation passed; rolled back.')
  if (process.argv.includes('--apply')) {
    await client.query('BEGIN')
    await client.query('SET LOCAL search_path TO public')
    await client.query(ddl)
    await client.query('COMMIT')
    console.log('YouTube tables applied; invitation data unchanged.')
  }
} catch (error) { await client.query('ROLLBACK').catch(() => {}); console.error(error.code || error.name); process.exitCode = 1 }
finally { await client.end() }
