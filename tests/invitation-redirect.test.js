import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/invitation.js'

test('Google response recovery repeats only GET, never the write or its secret', async t => {
  const oldUrl = process.env.GOOGLE_SCRIPT_URL
  const oldSecret = process.env.GOOGLE_SCRIPT_SECRET
  process.env.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec'
  process.env.GOOGLE_SCRIPT_SECRET = 'test-secret'
  t.after(() => {
    if (oldUrl === undefined) delete process.env.GOOGLE_SCRIPT_URL; else process.env.GOOGLE_SCRIPT_URL = oldUrl
    if (oldSecret === undefined) delete process.env.GOOGLE_SCRIPT_SECRET; else process.env.GOOGLE_SCRIPT_SECRET = oldSecret
  })
  for (const mode of ['recover', 'persistent', 'untrusted']) {
    const calls = []
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url: String(url), ...options })
      if (calls.length === 1) return new Response(null, { status: 302, headers: { location: mode === 'untrusted' ? 'https://example.com/steal' : 'https://script.googleusercontent.com/macros/echo?test' } })
      if (calls.length === 2 || mode === 'persistent') return new Response('missing', { status: 404 })
      return Response.json({ ok: true, invitation: { songs: [{ title: 'Edited', artist: 'Test' }] } })
    })
    const res = { setHeader() {}, status(code) { this.code = code; return this }, json(body) { this.body = body } }
    await handler({ method: 'POST', headers: {}, body: { action: 'songs', code: 'ABCDEF123456', songs: [{ title: 'Edited', artist: 'Test' }] } }, res)
    assert.equal(res.code, mode === 'recover' ? 200 : 502)
    assert.equal(calls.filter(call => call.method === 'POST').length, 1)
    assert.equal(calls.length, mode === 'untrusted' ? 1 : 3)
    for (const call of calls.slice(1)) { assert.equal(call.body, undefined); assert.equal(call.headers, undefined) }
    t.mock.restoreAll()
  }
})
