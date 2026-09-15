import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { syncSheets } from '../server/sheets-mirror.js'

test('mirror lease releases on failure and newer changes remain pending after an older acknowledgement', async t => {
  const db = new PGlite()
  try {
    await db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
    await db.exec(`INSERT INTO wedding_config(singleton,attendance_close,songs_close) VALUES (true,now()+interval '1 day',now()+interval '1 day')`)
    t.mock.method(globalThis, 'fetch', async () => new Response('Temporary failure', { status: 404 }))
    await assert.rejects(syncSheets(db))
    let state = (await db.query('SELECT * FROM wedding_sync_state')).rows[0]
    assert.equal(state.lease_token, null)
    assert.ok(Number(state.version) > Number(state.synced_version))
    t.mock.restoreAll()
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      const { snapshot } = JSON.parse(options.body)
      await db.exec('UPDATE wedding_config SET catalog_updated_at=now()')
      return Response.json({ ok: true, version: snapshot.version })
    })
    await syncSheets(db)
    state = (await db.query('SELECT * FROM wedding_sync_state')).rows[0]
    assert.ok(Number(state.version) > Number(state.synced_version))
    assert.equal(state.lease_token, null)
    t.mock.restoreAll()
    t.mock.method(globalThis, 'fetch', async (_url, options) => Response.json({ ok: true, version: JSON.parse(options.body).snapshot.version }))
    assert.equal((await syncSheets(db)).synced, true)
    state = (await db.query('SELECT * FROM wedding_sync_state')).rows[0]
    assert.equal(state.version, state.synced_version)
    await db.exec(`UPDATE wedding_sync_state SET lease_token='another-worker',lease_until=now()+interval '90 seconds'`)
    assert.equal((await syncSheets(db)).busy, true)
  } finally { await db.close() }
})
