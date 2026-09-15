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
    await db.exec('UPDATE wedding_config SET catalog_updated_at=now()')
    t.mock.restoreAll()
    process.env.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec'
    const methods = []
    let version
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      methods.push(options.method)
      if (options.method === 'POST') {
        version = JSON.parse(options.body).snapshot.version
        assert.equal(options.redirect, 'manual')
        return new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/test' } })
      }
      assert.equal(options.body, undefined)
      return methods.length === 2 ? new Response(null, { status: 404 }) : Response.json({ ok: true, version })
    })
    assert.equal((await syncSheets(db)).synced, true)
    assert.deepEqual(methods, ['POST', 'GET', 'GET'])
    delete process.env.GOOGLE_SCRIPT_URL
    await db.exec(`UPDATE wedding_sync_state SET lease_token='another-worker',lease_until=now()+interval '90 seconds'`)
    assert.equal((await syncSheets(db)).busy, true)
  } finally { await db.close() }
})
