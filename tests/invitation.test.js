import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import handler from '../api/invitation.js'

const source = readFileSync(new URL('../apps-script/Code.js', import.meta.url), 'utf8')
const before = Date.parse('2026-11-06T04:59:59.999Z')
const close = before + 1
const code = 'ABCDEF123456'

class Sheet {
  constructor(data = []) { this.data = data }
  getDataRange() { return { getValues: () => this.data.map(row => row.slice()) } }
  getLastRow() { return this.data.length }
  clearContents() { this.data = [] }
  getRange(row, col) {
    return { setValues: values => {
      values.forEach((valuesRow, i) => valuesRow.forEach((value, j) => {
        this.data[row - 1 + i] ||= []
        // Sheets treats a leading apostrophe as a literal-value escape.
        this.data[row - 1 + i][col - 1 + j] = typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value
      }))
    } }
  }
}

function fixture() {
  const sheets = {
    Invitaciones: new Sheet([['id', 'grupo', 'codigo'], ['a', 'Familia A', code], ['b', 'Familia B', '123456ABCDEF']]),
    Integrantes: new Sheet([['id', 'invitacion_id', 'nombre'], ['a1', 'a', 'Ana'], ['a2', 'a', 'Luis'], ['b1', 'b', 'Eva']]),
    Respuestas: new Sheet([['id', 'json', 'updated', 's1', 'a1', 's2', 'a2', 's3', 'a3', 's4', 'a4', 'updated']]),
    Configuración: new Sheet([['key', 'value'], ['attendanceClose', '2026-11-06T00:00:00-05:00'], ['songsClose', '2026-11-06T00:00:00-05:00']]),
    'Control de asistencia': new Sheet(), 'Lista para el DJ': new Sheet(),
  }
  const ss = { getSheetByName: name => sheets[name] }
  const properties = { API_SECRET: 'test-secret', SPREADSHEET_ID: 'test' }
  let held = false
  const locks = []
  const context = vm.createContext({
    Date: class extends Date { static now() { return before } }, Set, JSON,
    SpreadsheetApp: { flush() {}, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] || null, setProperty: (key, value) => { properties[key] = value }, deleteProperty: key => { delete properties[key] }, getProperties: () => ({ ...properties }) }) },
    LockService: { getScriptLock: () => ({ tryLock() { if (held) return false; held = true; locks.push('acquire'); return true }, releaseLock() { assert.equal(held, true); held = false; locks.push('release') } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  })
  vm.runInContext(source, context)
  return { context, sheets, locks, run: (action, data = {}, now = before, selectedCode = code) => context.processRequest(ss, { action, code: selectedCode, ...data }, now) }
}
const answers = values => ({ attendees: values.map((attending, index) => ({ id: `a${index + 1}`, attending })) })

test('database mirror is authenticated, ordered, idempotent and disables old writes', () => {
  const f = fixture()
  const snapshot = { version: '10', config: { attendance_close: '2026-11-06T05:00:00Z', songs_close: '2026-11-06T05:00:00Z' }, invitations: [{
    id: 'db-group', group_name: 'Database group', code: 'ABCDEF123456', members: [{ id: 'db-person', name: 'Test' }], attendance: [{ id: 'db-person', attending: true }], songs: [{ title: '=literal', artist: 'Artist' }], attendance_updated_at: '2026-09-15T00:00:00Z', songs_updated_at: '2026-09-15T00:00:00Z',
  }] }
  const send = (secret, data = snapshot) => f.context.doPost({ postData: { contents: JSON.stringify({ action: 'mirrorDatabase', secret, snapshot: data }) } })
  assert.equal(send('wrong').status, 401)
  assert.equal(send('test-secret').version, '10')
  assert.equal(f.sheets.Respuestas.data[1][3], '=literal')
  snapshot.invitations[0].songs[0].youtubeUrl = 'https://www.youtube.com/watch?v=abcdefghijk'
  send('test-secret')
  assert.equal(f.sheets.Respuestas.data[1][12], snapshot.invitations[0].songs[0].youtubeUrl)
  assert.equal(f.sheets['Lista para el DJ'].data[1][3], snapshot.invitations[0].songs[0].youtubeUrl)
  assert.equal(f.sheets['Control de asistencia'].data[1][2], 'Asistirá')
  assert.equal(send('test-secret', { ...snapshot, version: '9', invitations: [] }).version, '10')
  assert.equal(f.sheets.Invitaciones.data[1][0], 'db-group')
  assert.equal(send('test-secret').version, '10')
  const old = f.context.doPost({ postData: { contents: JSON.stringify({ action: 'songs', secret: 'test-secret', clientKey: 'a'.repeat(64), code, songs: [] }) } })
  assert.equal(old.status, 503)
})

test('requests read each source sheet once and saves leave unrelated views untouched', () => {
  for (const action of ['lookup', 'attendance', 'songs']) {
    const f = fixture()
    const reads = {}
    for (const [name, sheet] of Object.entries(f.sheets)) {
      const original = sheet.getDataRange.bind(sheet)
      sheet.getDataRange = () => { reads[name] = (reads[name] || 0) + 1; return original() }
    }
    const untouched = action === 'attendance' ? 'Lista para el DJ' : 'Control de asistencia'
    f.sheets[untouched].data = [['existing view']]
    f.run(action, action === 'attendance' ? answers([true, false]) : { songs: [] })
    for (const name of ['Invitaciones', 'Integrantes', 'Configuración', 'Respuestas']) assert.equal(reads[name], 1, `${action}: ${name}`)
    assert.deepEqual(f.sheets[untouched].data, [['existing view']])
  }
})

test('lookup isolates groups, starts pending, rejects unknown and duplicate codes', () => {
  const f = fixture()
  assert.deepEqual(JSON.parse(JSON.stringify(f.run('lookup').attendees)), [{ id: 'a1', name: 'Ana', attending: null }, { id: 'a2', name: 'Luis', attending: null }])
  assert.equal(f.run('lookup', {}, before, '123456ABCDEF').attendees.length, 1)
  assert.throws(() => f.run('lookup', {}, before, '000000000000'), { status: 401 })
  f.sheets.Invitaciones.data.push(['c', 'Other', code])
  assert.throws(() => f.run('lookup'), { status: 401 })
})

test('total, partial and declined attendance update one row and correct totals', () => {
  const f = fixture()
  for (const values of [[true, true], [true, false], [false, false]]) {
    const result = f.run('attendance', answers(values))
    assert.deepEqual(Array.from(result.attendees, a => a.attending), values)
    assert.equal(f.sheets.Respuestas.data.length, 2)
  }
  assert.equal(f.sheets['Control de asistencia'].data[3][6], 2)
  assert.equal(f.run('lookup').attendees[0].attending, false)
})

test('attendance rejects missing, duplicate, foreign and non-boolean members', () => {
  const f = fixture()
  for (const attendees of [[], [{ id: 'a1', attending: true }], [{ id: 'a1', attending: true }, { id: 'a1', attending: false }], [{ id: 'a1', attending: true }, { id: 'b1', attending: false }], [{ id: 'a1', attending: 'yes' }, { id: 'a2', attending: null }], [null, null]]) {
    assert.throws(() => f.run('attendance', { attendees }), { status: 400 })
  }
  assert.equal(f.sheets.Respuestas.data.length, 1)
})

test('zero through four songs, edits and deletion preserve attendance', () => {
  const f = fixture()
  f.run('attendance', answers([false, true]))
  for (let n = 0; n <= 4; n++) {
    const songs = Array.from({ length: n }, (_, i) => ({ title: `Song ${i}`, artist: 'Artist' }))
    assert.equal(f.run('songs', { songs }).songs.length, n)
    assert.equal(f.run('lookup').attendees[0].attending, false)
  }
  f.run('attendance', answers([true, true]))
  assert.equal(f.run('lookup').songs.length, 4)
  f.run('songs', { songs: [] })
  assert.equal(f.run('lookup').songs.length, 0)
  assert.equal(f.sheets['Lista para el DJ'].data.filter(row => row[0] !== '').length, 1)
  assert.equal(f.sheets.Respuestas.data.length, 2)
})

test('songs can be saved before attendance and reject incomplete or fifth songs', () => {
  const f = fixture()
  f.run('songs', { songs: [{ title: 'Title', artist: 'Artist' }] })
  assert.equal(f.run('lookup').attendees[0].attending, null)
  for (const songs of [Array(5).fill({ title: 'Song', artist: 'Artist' }), [{ title: ' ', artist: 'A' }], [{ title: 'Song', artist: '' }], [{ title: 'x'.repeat(151), artist: 'A' }], [null]]) {
    assert.throws(() => f.run('songs', { songs }), { status: 400 })
  }
})

test('deadline is enforced server-side at midnight, lookup remains available', () => {
  const f = fixture()
  f.run('attendance', answers([true, false]), before)
  assert.throws(() => f.run('attendance', answers([true, true]), close), { status: 409, closed: 'attendance' })
  assert.throws(() => f.run('songs', { songs: [] }, close), { status: 409, closed: 'songs' })
  assert.equal(f.run('lookup', {}, close).attendanceClosed, true)
  assert.equal(f.run('lookup', {}, close).attendees[1].attending, false)
  f.sheets.Configuración.data[2][1] = '2026-12-01T00:00:00-05:00'
  assert.equal(f.run('songs', { songs: [] }, close).songsClosed, false)
  f.sheets.Configuración.data[1][1] = 'invalid'
  assert.throws(() => f.run('lookup'), { status: 503 })
})

test('formula-like input round-trips as text in responses and DJ view', () => {
  const f = fixture()
  f.run('songs', { songs: [{ title: '=IMPORTXML("url")', artist: '+Artist' }] })
  f.run('attendance', answers([true, true]))
  assert.equal(f.run('lookup').songs[0].title, '=IMPORTXML("url")')
  assert.equal(f.sheets['Lista para el DJ'].data[1][1], '=IMPORTXML("url")')
  assert.equal(f.context.cell('  =1+1'), "'  =1+1")
})

test('rate limiting persists and resets after 15 minutes', () => {
  const f = fixture()
  const key = 'a'.repeat(64)
  for (let n = 0; n < 60; n++) f.context.rateLimit(key, before)
  assert.throws(() => f.context.rateLimit(key, before + 1), { status: 429 })
  assert.doesNotThrow(() => f.context.rateLimit(key, before + 900000))
})

test('HTTP entry point requires secret and locks each read-modify-write', () => {
  const f = fixture()
  const post = payload => f.context.doPost({ postData: { contents: JSON.stringify(payload) } })
  assert.equal(post({ action: 'lookup', code }).status, 401)
  const common = { code, secret: 'test-secret', clientKey: 'b'.repeat(64) }
  assert.equal(post({ ...common, action: 'attendance', ...answers([true, false]) }).ok, true)
  assert.equal(post({ ...common, action: 'songs', songs: [{ title: 'Song', artist: 'Artist' }] }).ok, true)
  assert.deepEqual(f.locks, ['acquire', 'release', 'acquire', 'release'])
  assert.equal(f.run('lookup').attendees[1].attending, false)
  assert.equal(f.run('lookup').songs.length, 1)
})

test('concurrent lock contention rejects cleanly and validation failures release the lock', () => {
  const f = fixture()
  const common = { code, secret: 'test-secret', clientKey: 'c'.repeat(64), action: 'attendance', ...answers([true, false]) }
  const lock = f.context.LockService.getScriptLock()
  lock.tryLock()
  const blocked = f.context.doPost({ postData: { contents: JSON.stringify(common) } })
  assert.equal(blocked.status, 503)
  assert.equal(f.sheets.Respuestas.data.length, 1)
  lock.releaseLock()
  const invalid = f.context.doPost({ postData: { contents: JSON.stringify({ ...common, attendees: [] }) } })
  assert.equal(invalid.status, 400)
  const saved = f.context.doPost({ postData: { contents: JSON.stringify(common) } })
  assert.equal(saved.ok, true)
  assert.deepEqual(f.locks, ['acquire', 'release', 'acquire', 'release', 'acquire', 'release'])
})

function responseMock() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.code = n; return this }, json(body) { this.body = body; return this } }
}

test('Vercel proxy handles configuration, input, secret, and upstream errors', async () => {
  const original = { url: process.env.GOOGLE_SCRIPT_URL, secret: process.env.GOOGLE_SCRIPT_SECRET, fetch: globalThis.fetch }
  try {
    delete process.env.GOOGLE_SCRIPT_URL
    let res = responseMock()
    await handler({ method: 'POST' }, res)
    assert.equal(res.code, 503)
    process.env.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec'
    process.env.GOOGLE_SCRIPT_SECRET = 'secret'
    res = responseMock()
    await handler({ method: 'GET' }, res)
    assert.equal(res.code, 405)
    res = responseMock()
    await handler({ method: 'POST', body: { code: 'bad', action: 'lookup' } }, res)
    assert.equal(res.code, 400)
    globalThis.fetch = async (_url, options) => {
      const sent = JSON.parse(options.body)
      assert.equal(sent.secret, 'secret')
      assert.match(sent.clientKey, /^[a-f0-9]{64}$/)
      assert.equal(sent.code, code)
      return { ok: true, json: async () => ({ ok: true, invitation: { group: 'A' } }) }
    }
    const req = { method: 'POST', headers: { 'x-vercel-forwarded-for': '192.0.2.1' }, body: { code: code.toLowerCase(), action: 'lookup', secret: 'fake', clientKey: 'fake' } }
    res = responseMock()
    await handler(req, res)
    assert.equal(res.code, 200)
    assert.equal(res.body.secret, undefined)
    assert.equal(res.headers['Cache-Control'], 'no-store')
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, status: 409, error: 'Closed', closed: 'songs' }) })
    res = responseMock()
    await handler(req, res)
    assert.equal(res.code, 409)
    assert.equal(res.body.closed, 'songs')
    globalThis.fetch = async () => { throw new Error('timeout') }
    res = responseMock()
    await handler(req, res)
    assert.equal(res.code, 502)
  } finally {
    globalThis.fetch = original.fetch
    for (const [name, value] of [['GOOGLE_SCRIPT_URL', original.url], ['GOOGLE_SCRIPT_SECRET', original.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value
    }
  }
})
