import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { searchYoutube, cleanYoutube } from '../server/youtube.js'
import { handleInvitation } from '../server/invitation-store.js'
import { normalizeSongs, youtubeUrl, sameSongs } from '../shared/songs.js'
test('YouTube links are canonical, safe, and compatible with old songs', () => {
  const url = 'https://www.youtube.com/watch?v=abcdefghijk'
  assert.equal(youtubeUrl('https://youtu.be/abcdefghijk?t=30'), url)
  assert.equal(youtubeUrl('https://m.youtube.com/shorts/abcdefghijk'), url)
  for (const invalid of ['https://youtube.com.evil.test/watch?v=abcdefghijk', 'javascript:alert(1)', 'https://youtube.com/playlist?list=123', 'https://evil.test/abcdefghijk']) assert.throws(() => youtubeUrl(invalid))
  assert.deepEqual(normalizeSongs([{ title: ' Song ', artist: ' Artist ' }]), [{ title: 'Song', artist: 'Artist' }])
  assert.ok(sameSongs([{ title: '', artist: '', youtubeUrl: url, youtube: { title: 'metadata' } }], [{ title: '', artist: '', youtubeUrl: 'https://youtu.be/abcdefghijk' }]))
  assert.equal(sameSongs([{ title: '', artist: '', youtubeUrl: url }], [{ title: '', artist: '', youtubeUrl: 'https://youtu.be/zyxwvutsrqp' }]), false)
})
test('YouTube search quotas, cache, deadlines, save without provider, and metadata expiry', async () => {
  const db = new PGlite()
  const pool = { query: (...args) => db.query(...args), connect: async () => ({ query: (...args) => db.query(...args), release() {} }) }
  let calls = 0
  const options = { apiKey: 'fake', fetcher: async () => { calls++; return { ok: true, json: async () => ({ items: [{ id: { videoId: 'abcdefghijk' }, snippet: { title: 'Song', channelTitle: 'Channel' } }] }) } } }
  try {
    await db.exec(readFileSync('db/schema.sql', 'utf8'))
    await db.exec(readFileSync('db/youtube.sql', 'utf8'))
    await db.exec("INSERT INTO wedding_config(singleton,attendance_close,songs_close) VALUES(true,now()+interval '1 day',now()+interval '1 day')")
    await db.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES($1,$2,$3,$4)', ['yt', 'YT', 'TEST123', '[{"id":"a","name":"Ana"}]'])
    const search = (query, settings = options, code = 'TEST123') => searchYoutube(pool, { code, query }, settings)
    await assert.rejects(search('test', options, 'INVALID123'), { status: 401 })
    await assert.rejects(search('ab'), { status: 400 })
    await assert.rejects(search('missing', { apiKey: '' }), { status: 503 })
    const result = await search('test song')
    assert.equal(result[0].channel, 'Channel')
    await search('TEST song')
    assert.equal(calls, 1)
    const view = await handleInvitation(pool, { action: 'songs', code: 'TEST123', songs: [{ title: '', artist: '', youtubeUrl: 'https://youtu.be/abcdefghijk' }] }, 'c'.repeat(64))
    assert.equal(view.songs[0].youtube.title, 'Song')
    assert.equal(view.songs[0].artist, '')
    assert.equal(view.attendees[0].attending, null)
    await db.exec("UPDATE wedding_youtube_daily SET count=100")
    await assert.rejects(search('different'), { status: 429 })
    assert.equal(calls, 1)
    await db.exec('UPDATE wedding_youtube_daily SET count=0')
    await assert.rejects(search('timeout', { apiKey: 'fake', fetcher: async () => { throw new Error('timeout') } }), { status: 503 })
    const empty = await search('empty', { apiKey: 'fake', fetcher: async () => ({ ok: true, json: async () => ({ items: [] }) }) })
    assert.deepEqual(empty, [])
    for (let i = 0; i < 4; i++) await search('test song')
    await assert.rejects(search('test song'), { status: 429 })
    await db.exec("UPDATE wedding_config SET songs_close=now()-interval '1 second'")
    await assert.rejects(search('test song'), { status: 409 })
    await db.exec("UPDATE wedding_invitations SET songs=jsonb_set(songs,'{0,youtube,fetchedAt}',to_jsonb((now()-interval '30 days')::text))")
    await cleanYoutube(pool)
    const { rows: [saved] } = await db.query('SELECT songs FROM wedding_invitations')
    assert.equal(saved.songs[0].youtube, undefined)
    assert.equal(saved.songs[0].youtubeUrl, result[0].youtubeUrl)
    const before = (await db.query('SELECT version FROM wedding_sync_state')).rows[0].version
    await cleanYoutube(pool)
    assert.equal((await db.query('SELECT version FROM wedding_sync_state')).rows[0].version, before, 'No-op cleanup must not request another Sheets copy')
  } finally { await db.close() }
})
