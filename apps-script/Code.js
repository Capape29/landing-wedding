/* Google Apps Script V8. Paste into Code.gs in a script bound to the private sheet. */
const TABLES = {
  Invitaciones: ['id', 'grupo', 'codigo'],
  Integrantes: ['id', 'invitacion_id', 'nombre'],
  Respuestas: ['invitacion_id', 'asistencia_json', 'asistencia_actualizada', 'cancion_1', 'artista_1', 'cancion_2', 'artista_2', 'cancion_3', 'artista_3', 'cancion_4', 'artista_4', 'canciones_actualizadas'],
  'Control de asistencia': ['invitacion', 'integrante', 'estado', 'actualizada'],
  'Lista para el DJ': ['invitacion', 'cancion', 'artista'],
  Configuración: ['clave', 'valor'],
}

function book() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('Run setup first')
  return SpreadsheetApp.openById(id)
}

function rows(ss, name) {
  return ss.getSheetByName(name).getDataRange().getValues().slice(1).filter(row => row[0] !== '')
}

// Escape spreadsheet formula prefixes, including after whitespace.
function cell(value) {
  return typeof value === 'string' && /^\s*[=+@\-']/.test(value) ? "'" + value : value
}

function writeRow(sheet, row, values) {
  sheet.getRange(row, 1, 1, values.length).setValues([values.map(cell)])
}

function fail(status, error, extra) {
  throw Object.assign(new Error(error), { status, ...extra })
}

// oxlint-disable-next-line no-unused-vars -- Apps Script editor entry point
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  ss.setSpreadsheetTimeZone('America/Bogota')
  const props = PropertiesService.getScriptProperties()
  props.setProperty('SPREADSHEET_ID', ss.getId())
  if (!props.getProperty('API_SECRET')) props.setProperty('API_SECRET', Utilities.getUuid() + Utilities.getUuid())
  Object.keys(TABLES).forEach(name => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name)
    if (sheet.getLastRow() === 0) writeRow(sheet, 1, TABLES[name])
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, TABLES[name].length).setFontWeight('bold')
  })
  const config = ss.getSheetByName('Configuración')
  const keys = rows(ss, 'Configuración').map(row => row[0])
  ;['attendanceClose', 'songsClose'].forEach(key => {
    if (!keys.includes(key)) writeRow(config, config.getLastRow() + 1, [key, '2026-11-06T00:00:00-05:00'])
  })
}

// oxlint-disable-next-line no-unused-vars -- Apps Script editor entry point
function generateCodes() {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const ss = book()
    const sheet = ss.getSheetByName('Invitaciones')
    const data = sheet.getDataRange().getValues()
    const used = new Set(data.slice(1).map(row => String(row[2])))
    data.slice(1).forEach((row, index) => {
      if (!row[0] || !row[1] || row[2]) return
      let code
      do { code = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase() } while (used.has(code))
      used.add(code)
      sheet.getRange(index + 2, 3).setValue(code)
    })
    rebuildViews(ss)
    SpreadsheetApp.flush()
  } finally { lock.releaseLock() }
}

function deadline(ss, key) {
  const matches = rows(ss, 'Configuración').filter(row => row[0] === key)
  const value = matches[0]?.[1]
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  if (matches.length !== 1 || !Number.isFinite(timestamp)) fail(503, 'No se ha configurado el cierre. Contacta a los organizadores.')
  return timestamp
}

// Persist rate limits across Vercel instances, under the same script lock.
function rateLimit(clientKey, now) {
  if (!/^[a-f0-9]{64}$/.test(clientKey || '')) fail(400, 'Solicitud inválida.')
  const props = PropertiesService.getScriptProperties()
  const all = props.getProperties()
  Object.keys(all).filter(key => key.startsWith('rate:')).forEach(key => {
    if (JSON.parse(all[key]).until <= now) props.deleteProperty(key)
  })
  const key = 'rate:' + clientKey
  const current = props.getProperty(key)
  const bucket = current ? JSON.parse(current) : { count: 0, until: now + 900000 }
  if (bucket.count >= 60) fail(429, 'Has realizado muchos intentos. Espera 15 minutos e inténtalo de nuevo.')
  bucket.count += 1
  props.setProperty(key, JSON.stringify(bucket))
}

function invitationData(ss, invitation, members, response, now) {
  const answers = response[1] ? JSON.parse(response[1]) : []
  const attendanceClose = deadline(ss, 'attendanceClose')
  const songsClose = deadline(ss, 'songsClose')
  const songs = []
  for (let i = 3; i <= 9; i += 2) {
    if (response[i] || response[i + 1]) songs.push({ title: String(response[i] || ''), artist: String(response[i + 1] || '') })
  }
  return {
    id: String(invitation[0]), group: String(invitation[1]),
    attendees: members.map(row => ({ id: String(row[0]), name: String(row[2]), attending: answers.find(answer => answer.id === String(row[0]))?.attending ?? null })),
    songs, attendanceUpdatedAt: response[2] || null, songsUpdatedAt: response[11] || null,
    attendanceClose: new Date(attendanceClose).toISOString(), songsClose: new Date(songsClose).toISOString(),
    attendanceClosed: now >= attendanceClose, songsClosed: now >= songsClose,
  }
}

function processRequest(ss, payload, now) {
  if (!['lookup', 'attendance', 'songs'].includes(payload.action) || !/^[A-Z0-9]{12}$/.test(payload.code || '')) fail(400, 'Revisa el código de invitación.')
  const matches = rows(ss, 'Invitaciones').filter(row => String(row[2]).trim().toUpperCase() === payload.code)
  if (matches.length !== 1) fail(401, 'No encontramos esa invitación. Revisa tu código.')
  const invitation = matches[0]
  if (rows(ss, 'Invitaciones').filter(row => String(row[0]) === String(invitation[0])).length !== 1) fail(503, 'Contacta a los organizadores para revisar tu invitación.')
  const members = rows(ss, 'Integrantes').filter(row => String(row[1]) === String(invitation[0]))
  if (!members.length || new Set(members.map(row => String(row[0]))).size !== members.length) fail(503, 'Contacta a los organizadores para revisar los integrantes.')
  const sheet = ss.getSheetByName('Respuestas')
  const data = sheet.getDataRange().getValues()
  const indexes = data.map((row, index) => String(row[0]) === String(invitation[0]) ? index : -1).filter(index => index > 0)
  if (indexes.length > 1) fail(503, 'Contacta a los organizadores para revisar tus respuestas.')
  const index = indexes[0] ?? -1
  const response = index < 0 ? [String(invitation[0]), ...Array(11).fill('')] : data[index].slice()
  const view = invitationData(ss, invitation, members, response, now)
  if (payload.action === 'lookup') return view
  if (payload.action === 'attendance') {
    if (view.attendanceClosed) fail(409, 'El plazo para confirmar asistencia ha terminado.', { closed: 'attendance' })
    const answers = payload.attendees
    if (!Array.isArray(answers) || answers.length !== members.length || new Set(answers.map(a => a?.id)).size !== members.length || answers.some(a => !a || typeof a.attending !== 'boolean' || !members.some(m => String(m[0]) === a.id))) fail(400, 'Indica si asistirá cada integrante de tu invitación.')
    response[1] = JSON.stringify(answers.map(a => ({ id: a.id, attending: a.attending })))
    response[2] = new Date(now).toISOString()
  } else {
    if (view.songsClosed) fail(409, 'El plazo para sugerir canciones ha terminado.', { closed: 'songs' })
    if (!Array.isArray(payload.songs) || payload.songs.length > 4 || payload.songs.some(s => !s || typeof s.title !== 'string' || typeof s.artist !== 'string' || !s.title.trim() || !s.artist.trim() || s.title.length > 150 || s.artist.length > 150)) fail(400, 'Puedes guardar hasta cuatro canciones con título y artista (máximo 150 caracteres por campo).')
    for (let i = 0; i < 4; i++) {
      response[3 + i * 2] = payload.songs[i]?.title.trim() || ''
      response[4 + i * 2] = payload.songs[i]?.artist.trim() || ''
    }
    response[11] = new Date(now).toISOString()
  }
  writeRow(sheet, index < 0 ? sheet.getLastRow() + 1 : index + 1, response)
  SpreadsheetApp.flush()
  rebuildViews(ss)
  SpreadsheetApp.flush()
  return invitationData(ss, invitation, members, response, now)
}

function rebuildViews(ss) {
  const invitations = rows(ss, 'Invitaciones')
  const responses = rows(ss, 'Respuestas')
  const attendance = rows(ss, 'Integrantes').map(member => {
    const group = invitations.find(row => String(row[0]) === String(member[1]))
    const response = responses.find(row => String(row[0]) === String(member[1]))
    const answers = response?.[1] ? JSON.parse(response[1]) : []
    const answer = answers.find(a => a.id === String(member[0]))
    return [group?.[1] || member[1], member[2], answer ? (answer.attending ? 'Asistirá' : 'No asistirá') : 'Pendiente', response?.[2] || '']
  })
  const dj = []
  responses.forEach(response => {
    const group = invitations.find(row => String(row[0]) === String(response[0]))
    for (let i = 3; i <= 9; i += 2) if (response[i]) dj.push([group?.[1] || response[0], response[i], response[i + 1]])
  })
  ;[['Control de asistencia', attendance], ['Lista para el DJ', dj]].forEach(([name, data]) => {
    const sheet = ss.getSheetByName(name)
    sheet.clearContents()
    writeRow(sheet, 1, TABLES[name])
    if (data.length) sheet.getRange(2, 1, data.length, TABLES[name].length).setValues(data.map(row => row.map(cell)))
  })
  const totals = [['Estado', 'Total'], ...['Pendiente', 'Asistirá', 'No asistirá'].map(state => [state, attendance.filter(row => row[2] === state).length])]
  ss.getSheetByName('Control de asistencia').getRange(1, 6, totals.length, 2).setValues(totals)
}

// oxlint-disable-next-line no-unused-vars -- Apps Script editor entry point
function refreshViews() {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try { rebuildViews(book()); SpreadsheetApp.flush() } finally { lock.releaseLock() }
}

// oxlint-disable-next-line no-unused-vars -- Apps Script HTTP entry point
function doPost(event) {
  let lock
  let acquired = false
  let result
  try {
    const text = event?.postData?.contents || ''
    if (text.length > 16000) fail(400, 'Solicitud demasiado grande.')
    const payload = JSON.parse(text)
    const secret = PropertiesService.getScriptProperties().getProperty('API_SECRET')
    if (!secret || payload.secret !== secret) fail(401, 'Solicitud no autorizada.')
    lock = LockService.getScriptLock()
    acquired = lock.tryLock(8000)
    if (!acquired) fail(503, 'Estamos procesando otras respuestas. Inténtalo nuevamente.')
    const now = Date.now()
    rateLimit(payload.clientKey, now)
    result = { ok: true, invitation: processRequest(book(), payload, now) }
  } catch (error) {
    result = { ok: false, status: error.status || 503, error: error.status ? error.message : 'No pudimos guardar tu respuesta. Inténtalo nuevamente.', closed: error.closed }
  } finally { if (acquired) lock.releaseLock() }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)
}
