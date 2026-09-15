import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { handleInvitation } from '../server/invitation-store.js'

test('PostgreSQL contract: isolation, independent edits, deletion, deadlines, limits and dirty revision', async () => {
  const db = new PGlite()
  const pool = { query: (...args) => db.query(...args), connect: async () => ({ query: (...args) => db.query(...args), release() {} }) }
  try {
    await db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
    await db.exec(`INSERT INTO wedding_config(singleton,attendance_close,songs_close) VALUES(true,now()+interval '1 day',now()+interval '1 day')`)
    await db.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES ($1,$2,$3,$4)', ['a', 'Test A', 'FAMILIA12345', JSON.stringify([{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }])])
    await db.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES ($1,$2,$3,$4)', ['b', 'Test B', 'OTHER1234567', JSON.stringify([{ id: 'p3', name: 'Three' }])])
    const run = (action, data = {}, code = 'familia12345', key = 'a'.repeat(64)) => handleInvitation(pool, { action, code, ...data }, key)
    let view = await run('lookup')
    assert.equal(view.attendees.length, 2)
    assert.equal(view.attendees[0].attending, null)
    await assert.rejects(run('lookup', {}, 'UNKNOWN12345'), { status: 401 })
    await assert.rejects(run('attendance', { attendees: [{ id: 'p3', attending: true }] }), { status: 400 })
    view = await run('songs', { songs: [{ title: ' =literal ', artist: ' Artist ' }] })
    assert.equal(view.songs[0].title, '=literal')
    assert.equal(view.attendanceUpdatedAt, null)
    view = await run('attendance', { attendees: [{ id: 'p1', attending: true }, { id: 'p2', attending: false }] })
    assert.equal(view.songs.length, 1)
    assert.equal(view.attendees[1].attending, false)
    view = await run('songs', { songs: [] })
    assert.equal(view.songs.length, 0)
    assert.equal(view.attendees[0].attending, true)
    assert.equal((await run('lookup', {}, 'OTHER1234567')).songs.length, 0)
    await assert.rejects(run('songs', { songs: Array(5).fill({ title: 'x', artist: 'y' }) }), { status: 400 })
    await db.exec(`UPDATE wedding_config SET songs_close=now()-interval '1 second'`)
    await assert.rejects(run('songs', { songs: [] }), { status: 409, closed: 'songs' })
    assert.equal((await run('lookup')).songsClosed, true)
    await db.query('INSERT INTO wedding_rate_limits(client_key,count,expires_at) VALUES ($1,60,now()+interval \'15 minutes\')', ['b'.repeat(64)])
    await assert.rejects(run('lookup', {}, 'FAMILIA12345', 'b'.repeat(64)), { status: 429 })
    const { rows: [sync] } = await db.query('SELECT version,synced_version FROM wedding_sync_state')
    assert.ok(Number(sync.version) > Number(sync.synced_version))
  } finally { await db.close() }
})
