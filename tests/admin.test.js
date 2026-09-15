import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { createInvitation, loginLimit, passwordMatches, sessionToken, validSession } from '../server/admin.js'
import { handleInvitation } from '../server/invitation-store.js'
import handler from '../api/admin.js'

test('admin session rejects tampering, expiry and wrong passwords', () => {
  const secret = 'test-secret-at-least-20-characters'
  const token = sessionToken(secret)
  assert.ok(validSession(token, secret))
  assert.equal(validSession(token, 'another-secret'), false)
  assert.equal(validSession(token, secret, Date.now() + 28800001), false)
  assert.equal(validSession('invalid', secret), false)
  assert.ok(passwordMatches(secret, secret))
  assert.equal(passwordMatches('wrong', secret), false)
})
test('admin endpoint blocks anonymous reads and cross-origin writes before database access', async () => {
  process.env.ADMIN_PASSWORD = 'test-secret-at-least-20-characters'
  const response = () => ({ statusCode: 200, setHeader() {}, status(s) { this.statusCode = s; return this }, json(data) { this.data = data; return this } })
  const res = response()
  await handler({ method: 'GET', headers: {} }, res)
  assert.equal(res.statusCode, 401)
  const cross = response()
  await handler({ method: 'POST', headers: { origin: 'https://evil.example', host: 'wedding.example', 'content-type': 'application/json' }, body: { action: 'create' } }, cross)
  assert.equal(cross.statusCode, 403)
  delete process.env.ADMIN_PASSWORD
})
test('new invitations work for guests, duplicate codes preserve data, login attempts are limited', async () => {
  const db = new PGlite()
  const pool = { query: (...args) => db.query(...args), connect: async () => ({ query: (...args) => db.query(...args), release() {} }) }
  try {
    await db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
    await db.exec(`INSERT INTO wedding_config(singleton,attendance_close,songs_close) VALUES(true,now()+interval '1 day',now()+interval '1 day')`)
    const payload = { group: 'Familia Prueba', code: ' prueba123 ', members: [' Ana ', 'Luis'] }
    const row = await createInvitation(pool, payload)
    assert.equal(row.code, 'PRUEBA123')
    assert.equal(row.members[0].name, 'Ana')
    assert.notEqual(row.members[0].id, row.members[1].id)
    await assert.rejects(createInvitation(pool, payload), { status: 409 })
    await assert.rejects(createInvitation(pool, { ...payload, members: [] }), { status: 400 })
    await assert.rejects(createInvitation(pool, { ...payload, code: 'bad code' }), { status: 400 })
    const view = await handleInvitation(pool, { action: 'lookup', code: 'PRUEBA123' }, 'a'.repeat(64))
    assert.equal(view.attendees.length, 2)
    assert.equal(view.attendees[0].attending, null)
    assert.equal((await db.query('SELECT * FROM wedding_invitations')).rows.length, 1)
    assert.ok(Number((await db.query('SELECT version FROM wedding_sync_state')).rows[0].version) > 0)
    for (let i = 0; i < 10; i++) await loginLimit(pool, 'test-ip', 'secret')
    await assert.rejects(loginLimit(pool, 'test-ip', 'secret'), { status: 429 })
  } finally { await db.close() }
})
