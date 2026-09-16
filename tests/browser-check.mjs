// Local browser check with a mock API; never writes to Google Sheets.
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const directory = resolve('.cache/browser-check')
await mkdir(directory, { recursive: true })
let failure = false
let closed = false
let requests = 0
const invitation = {
  id: 'test', group: 'Familia de prueba',
  attendees: [{ id: '1', name: 'Laura de prueba', attending: null }, { id: '2', name: 'Gustavo de prueba', attending: null }],
  songs: [], attendanceClose: '2026-11-06T05:00:00.000Z', songsClose: '2026-11-06T05:00:00.000Z',
  attendanceClosed: false, songsClosed: false,
}
const server = await createServer({ server: { host: '127.0.0.1', port: 4178, strictPort: true, watch: { ignored: ['**/.cache/**'] } }, plugins: [{
  name: 'test-invitation-api',
  configureServer(vite) {
    vite.middlewares.use('/api/youtube-search', async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      const { query } = JSON.parse(body)
      res.setHeader('Content-Type', 'application/json')
      if (query === 'failure') { res.statusCode = 503; res.end(JSON.stringify({ error: 'YouTube no disponible' })); return }
      res.end(JSON.stringify({ results: [{ videoId: 'abcdefghijk', title: 'Video de prueba', channel: 'Canal de prueba', thumbnail: '', youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk' }] }))
    })
    vite.middlewares.use('/api/invitation', async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      const data = JSON.parse(body)
      requests++
      res.setHeader('Content-Type', 'application/json')
      if (data.code !== 'ABCDEF123456') { res.statusCode = 401; res.end(JSON.stringify({ error: 'Código incorrecto.' })); return }
      if (closed && data.action !== 'lookup') { res.statusCode = 409; res.end(JSON.stringify({ error: 'El plazo ha terminado.', closed: data.action })); return }
      if (failure) { res.statusCode = 502; res.end(JSON.stringify({ error: 'Error de conexión de prueba.' })); return }
      if (data.action === 'attendance') {
        invitation.attendees = invitation.attendees.map(person => ({ ...person, attending: data.attendees.find(a => a.id === person.id).attending }))
        invitation.attendanceUpdatedAt = new Date().toISOString()
      }
      if (data.action === 'songs') { invitation.songs = data.songs; invitation.songsUpdatedAt = new Date().toISOString() }
      res.end(JSON.stringify({ invitation }))
    })
  },
}] })
await server.listen()
const executable = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', `--user-data-dir=${directory}/profile`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(r => setTimeout(r, ms))
let socket
try {
  let target
  for (let n = 0; n < 80; n++) {
    try { target = (await (await fetch('http://127.0.0.1:9337/json')).json()).find(item => item.type === 'page'); if (target) break } catch { /* browser starting */ }
    await pause(100)
  }
  assert.ok(target, 'Browser must start')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject })
  let sequence = 0
  const pending = new Map()
  socket.onmessage = event => {
    const data = JSON.parse(event.data)
    if (pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id) }
  }
  const send = async (method, params = {}) => {
    const id = ++sequence
    const result = await new Promise(resolveResult => { pending.set(id, resolveResult); socket.send(JSON.stringify({ id, method, params })) })
    if (result.error) throw new Error(JSON.stringify(result.error))
    return result.result
  }
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const until = async expression => {
    for (let n = 0; n < 100; n++) { if (await evaluate(expression)) return; await pause(50) }
    throw new Error('Timed out: ' + expression)
  }
  const fill = async (id, value) => {
    await evaluate(`(() => { const element = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  }
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === ${JSON.stringify(label)}).click()`)
  const shot = async name => {
    await pause(150)
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${directory}/${name}.png`, Buffer.from(result.data, 'base64'))
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: 'http://127.0.0.1:4178/#rsvp-section' })
  await until("!!document.getElementById('invitation-code')")
  await fill('invitation-code', '000000000000')
  await click('Ver mi invitación')
  await until("document.body.textContent.includes('Código incorrecto.')")
  await fill('invitation-code', 'ABCDEF123456')
  await click('Ver mi invitación')
  await until("document.body.textContent.includes('Familia de prueba')")
  assert.equal(await evaluate("document.querySelectorAll('input[type=radio]:checked').length"), 0)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await evaluate("document.getElementById('rsvp-section').scrollIntoView({behavior:'instant'})")
  await shot('mobile-attendance')
  // Native required radio validation blocks an incomplete form.
  const count = requests
  await click('Guardar asistencia')
  await pause(100)
  assert.equal(requests, count)
  await evaluate("document.querySelectorAll('input[type=radio]')[0].click(); document.querySelectorAll('input[type=radio]')[3].click()")
  await click('Guardar asistencia')
  await until("document.body.textContent.includes('Tu respuesta ya fue enviada.')")
  assert.equal(await evaluate("document.body.textContent.includes('Tu respuesta ya fue enviada.')"), true)
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Guardar asistencia').disabled"), true)
  await fill('song-0-search', 'test song')
  await click('Buscar en YouTube')
  await until("document.body.textContent.includes('Video de prueba')")
  await click('Agregar')
  assert.equal(invitation.songs.length, 0, 'Selecting is not saving')
  await click('Guardar canciones')
  await until("document.body.textContent.includes('Tus canciones ya fueron enviadas.')")
  assert.equal(invitation.songs[0].youtubeUrl, 'https://www.youtube.com/watch?v=abcdefghijk')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await evaluate("document.querySelector('button[aria-label^=\"Quitar\"]').click()")
  assert.equal(await evaluate("!!document.getElementById('song-0-url')"), false)
  assert.equal(await evaluate("!!document.getElementById('song-0-title')"), false)
  await fill('song-0-search', 'failure')
  await click('Buscar en YouTube')
  await until("document.body.textContent.includes('YouTube no disponible')")
  await click('Guardar canciones')
  await until("document.body.textContent.includes('Tus canciones ya fueron enviadas.')")
  await fill('song-0-search', 'test song')
  await click('Buscar en YouTube')
  await until("document.body.textContent.includes('Video de prueba')")
  await click('Agregar')
  await click('Guardar canciones')
  await until("document.body.textContent.includes('Tus canciones ya fueron enviadas.')")
  await evaluate("document.getElementById('songs-section').scrollIntoView({behavior:'instant'})")
  await shot('mobile-songs')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await shot('desktop-songs')
  await evaluate("document.querySelector('button[aria-label^=\"Quitar\"]').click()")
  await click('Guardar canciones')
  await until("document.body.textContent.includes('Tus canciones ya fueron enviadas.')")
  assert.equal(invitation.songs.length, 0)
  closed = true
  await evaluate("document.querySelectorAll('input[type=radio]')[1].click()")
  await until("document.body.textContent.includes('Cambios sin guardar')")
  await click('Guardar asistencia')
  await until("document.body.textContent.includes('El plazo para confirmar asistencia ha terminado.')")
  assert.equal(await evaluate("document.querySelector('input[type=radio]').matches(':disabled')"), true)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert.equal(await evaluate("document.activeElement !== document.body"), true)
  console.log('Browser checks passed: mobile/desktop, invalid code, pending/partial attendance, song validation, failure recovery, reload, deletion, closure, keyboard. Screenshots: .cache/browser-check')
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }))
  socket?.close()
  browser.kill()
  await server.close()
}
