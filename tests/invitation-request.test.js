import test from 'node:test'
import assert from 'node:assert/strict'
import { request } from '../src/invitationRequest.js'

test('lost save response is reconciled without a second write, including edits and deletion', async t => {
  for (const songs of [[{ title: 'Edited song', artist: 'Artist' }], []]) {
    const actions = []
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      const body = JSON.parse(options.body)
      actions.push(body.action)
      if (body.action === 'songs') throw new TypeError('Connection lost after saving')
      return Response.json({ invitation: { songs, songsUpdatedAt: '2026-09-15' } })
    })
    const result = await request('songs', 'ABCDEF123456', { songs })
    assert.deepEqual(result.songs, songs)
    assert.deepEqual(actions, ['songs', 'lookup'])
    t.mock.restoreAll()
  }
})

test('a previous saved selection is never reported as the new successful save', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => JSON.parse(options.body).action === 'songs'
    ? Response.json({ error: 'Timeout' }, { status: 502 })
    : Response.json({ invitation: { songs: [], songsUpdatedAt: '2026-09-14' } }))
  await assert.rejects(request('songs', 'ABCDEF123456', { songs: [{ title: 'New', artist: 'Artist' }] }), /No pudimos verificar/)
})

test('validation failures do not trigger verification', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error: 'Closed', closed: 'songs' }, { status: 409 }) })
  await assert.rejects(request('songs', 'ABCDEF123456', { songs: [] }), { closed: 'songs' })
  assert.equal(calls, 1)
})
