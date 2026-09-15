// Uses only its own temporary invitation. Always removes it on completion.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { database } from '../server/database.js'
process.loadEnvFile('.cache/neon.env')
const pool = database()
const id = `youtube-test-${randomUUID()}`
const code = randomBytes(12).toString('hex').toUpperCase()
const origin = 'https://landing-wedding-phi.vercel.app'
const headers = { 'Content-Type': 'application/json' }
const cronSecret = readFileSync('.cache/cron-secret.txt', 'utf8').trim()
async function sync() {
  let failures = 0
  for (let attempt = 0; attempt < 18; attempt++) {
    const response = await fetch(origin + '/api/sheets-sync', { method: 'POST', headers: { Authorization: `Bearer ${cronSecret}` }, signal: AbortSignal.timeout(55000) })
    const result = await response.json()
    if (response.ok && result.synced) return
    if (!response.ok && ++failures >= 3) throw new Error('Sheets synchronization failed after three attempts')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
  throw new Error('Sheets synchronization still busy')
}
const call = async (path, body) => {
  const response = await fetch(origin + path, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) })
  return { status: response.status, data: await response.json() }
}
try {
  await pool.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES($1,$2,$3,$4)', [id, 'Prueba temporal YouTube', code, JSON.stringify([{ id, name: 'Prueba temporal' }])])
  const invalid = await call('/api/youtube-search', { code: 'INVALIDCODE123', query: 'test' })
  assert.equal(invalid.status, 401)
  const search = await call('/api/youtube-search', { code, query: 'Luis Miguel Hasta que me olvides' })
  let song = { title: '', artist: '', youtubeUrl: 'https://youtu.be/M7lc1UVf-VE' }
  if (search.status === 200) {
    assert.ok(search.data.results.length > 0)
    song.youtubeUrl = search.data.results[0].youtubeUrl
    console.log('Live YouTube search: OK')
  } else {
    assert.equal(search.status, 503)
    console.log('Live YouTube search unavailable:', search.data.error)
  }
  const saved = await call('/api/invitation', { action: 'songs', code, songs: [song] })
  assert.equal(saved.status, 200)
  assert.match(saved.data.invitation.songs[0].youtubeUrl, /^https:\/\/www.youtube.com\/watch\?v=/)
  const lookup = await call('/api/invitation', { action: 'lookup', code })
  assert.deepEqual(lookup.data.invitation.songs, saved.data.invitation.songs)
  assert.equal(lookup.data.invitation.attendees[0].attending, null)
  const password = readFileSync('.cache/admin-password.txt', 'utf8').trim()
  const login = await fetch(origin + '/api/admin', { method: 'POST', headers: { ...headers, Origin: origin }, body: JSON.stringify({ action: 'login', password }) })
  assert.equal(login.status, 200)
  const list = await fetch(origin + '/api/admin', { headers: { Cookie: login.headers.get('set-cookie').split(';')[0] } })
  const admin = await list.json()
  assert.equal(admin.invitations.find(row => row.id === id).songs[0].youtubeUrl, saved.data.invitation.songs[0].youtubeUrl)
  console.log('Public save, reload, unchanged attendance, and private admin link: OK')
  await sync()
  console.log('Sheets synced. Temporary YouTube invitation available for readback for 30 seconds.')
  await new Promise(resolve => setTimeout(resolve, 30000))
  const manual = await call('/api/invitation', { action: 'songs', code, songs: [{ title: 'Prueba manual', artist: 'Prueba' }] })
  assert.equal(manual.status, 200)
  assert.equal(manual.data.invitation.songs[0].youtubeUrl, undefined)
  console.log('Replace with manual song: OK')
} finally {
  await pool.query('DELETE FROM wedding_invitations WHERE id=$1', [id])
  await pool.end()
  await sync()
  console.log('Temporary invitation removed and Sheets cleanup synced.')
}
