import { readFileSync } from 'node:fs'
import pg from 'pg'
const source = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const env = process.argv[3]
if (env) process.loadEnvFile(env)
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const groups = source.invitations.slice(1).filter(row => row[0])
const people = source.members.slice(1).filter(row => row[0])
const settings = Object.fromEntries(source.config.slice(1))
if (!groups.length || new Set(groups.map(r => r[0])).size !== groups.length || new Set(groups.map(r => String(r[2]).trim().toUpperCase())).size !== groups.length) throw new Error('Invalid or duplicate groups/codes')
if (new Set(people.map(r => r[0])).size !== people.length || people.some(p => !groups.some(g => g[0] === p[1]))) throw new Error('Duplicate or orphan members')
for (const key of ['attendanceClose', 'songsClose']) if (!Number.isFinite(Date.parse(settings[key]))) throw new Error('Invalid deadline')
const connection = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
connection.hostname = connection.hostname.replace('-pooler.', '.')
connection.searchParams.set('sslmode', 'verify-full')
const client = new pg.Client({ connectionString: connection.toString(), connectionTimeoutMillis: 8000 })
try {
  await client.connect()
  await client.query('BEGIN')
  await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
  const { rows: [existing] } = await client.query('SELECT count(*)::int AS count FROM wedding_invitations')
  if (existing.count) throw new Error('Database is not empty; refusing to overwrite invitations')
  for (const [id, group, rawCode] of groups) {
    const code = String(rawCode).trim().toUpperCase()
    const members = people.filter(p => p[1] === id).map(([id, , name]) => ({ id, name }))
    if (!/^[A-Z0-9]{6,32}$/.test(code) || !members.length || members.some(m => !m.id || !m.name)) throw new Error('Invalid invitation')
    await client.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES ($1,$2,$3,$4::jsonb)', [id, group, code, JSON.stringify(members)])
  }
  await client.query('INSERT INTO wedding_config(singleton,attendance_close,songs_close) VALUES (true,$1,$2)', [settings.attendanceClose, settings.songsClose])
  await client.query('COMMIT')
  console.log(JSON.stringify({ importedGroups: groups.length, importedMembers: people.length, importedResponses: 0 }))
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error(error.code || error.name)
  process.exitCode = 1
} finally { await client.end() }
