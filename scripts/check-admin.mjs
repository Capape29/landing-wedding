// Read-only production check. Never creates or changes invitation data.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const origin = 'https://landing-wedding-phi.vercel.app'
const password = readFileSync('.cache/admin-password.txt', 'utf8').trim()
const page = await fetch(`${origin}/admin`)
assert.equal(page.status, 200)
const anonymous = await fetch(`${origin}/api/admin`)
assert.equal(anonymous.status, 401)
const login = await fetch(`${origin}/api/admin`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', password }) })
assert.equal(login.status, 200)
const setCookie = login.headers.get('set-cookie')
assert.ok(setCookie.includes('HttpOnly') && setCookie.includes('Secure') && setCookie.includes('SameSite=Strict'))
const cookie = setCookie.split(';')[0]
const list = await fetch(`${origin}/api/admin`, { headers: { Cookie: cookie } })
assert.equal(list.status, 200)
assert.ok(Array.isArray((await list.json()).invitations))
const logout = await fetch(`${origin}/api/admin`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
assert.equal(logout.status, 200)
assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'))
console.log('Production admin: page, anonymous rejection, login, private list and logout OK. No invitation data changed.')
