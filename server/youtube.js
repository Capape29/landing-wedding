import { createHash } from 'node:crypto'
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
export async function searchYoutube(pool, payload, { apiKey = process.env.YOUTUBE_API_KEY, fetcher = fetch } = {}) {
  const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : ''
  const query = typeof payload?.query === 'string' ? payload.query.trim().replace(/\s+/g, ' ') : ''
  if (!/^[A-Z0-9]{6,32}$/.test(code) || query.length < 3 || query.length > 150) fail(400, 'Escribe entre 3 y 150 caracteres para buscar.')
  const { rows: [invitation] } = await pool.query(`SELECT i.id, clock_timestamp()>=c.songs_close AS closed FROM wedding_invitations i CROSS JOIN wedding_config c WHERE i.code=$1 AND i.active=true AND c.singleton=true`, [code])
  if (!invitation) fail(401, 'Revisa el código de tu invitación.')
  if (invitation.closed) fail(409, 'El plazo para sugerir canciones ha terminado.')
  const key = createHash('sha256').update(`youtube:${invitation.id}`).digest('hex')
  const { rows: [limit] } = await pool.query(`INSERT INTO wedding_rate_limits(client_key,count,expires_at) VALUES($1,1,now()+interval '15 minutes')
    ON CONFLICT(client_key) DO UPDATE SET count=CASE WHEN wedding_rate_limits.expires_at<=now() THEN 1 ELSE wedding_rate_limits.count+1 END,
    expires_at=CASE WHEN wedding_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE wedding_rate_limits.expires_at END RETURNING count`, [key])
  if (limit.count > 10) fail(429, 'Has realizado diez búsquedas. Espera 15 minutos para volver a buscar.')
  const cacheKey = query.toLocaleLowerCase('es')
  const { rows: [cached] } = await pool.query('SELECT results FROM wedding_youtube_cache WHERE query=$1 AND expires_at>now()', [cacheKey])
  if (cached) return cached.results
  if (!apiKey) fail(503, 'La búsqueda no está disponible. Inténtalo más tarde.')
  // Reserve before the network call: concurrent workers cannot exceed the daily quota.
  const { rows: [budget] } = await pool.query(`INSERT INTO wedding_youtube_daily(day,count) VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date,1)
    ON CONFLICT(day) DO UPDATE SET count=wedding_youtube_daily.count+1 WHERE wedding_youtube_daily.count<100 RETURNING count`)
  if (!budget) fail(429, 'Se alcanzó el límite diario de YouTube. Puedes volver a buscar mañana.')
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.search = new URLSearchParams({ part: 'snippet', type: 'video', q: query, maxResults: '5', relevanceLanguage: 'es', key: apiKey }).toString()
  let response
  try { response = await fetcher(url, { signal: AbortSignal.timeout(8000) }) } catch { fail(503, 'YouTube tardó demasiado. Inténtalo de nuevo.') }
  if (!response.ok) { console.warn('youtube_search_failed', response.status); fail(503, 'YouTube no está disponible. Inténtalo más tarde.') }
  const data = await response.json()
  const results = (data.items || []).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id?.videoId || '')).slice(0, 5).map(item => ({
    videoId: item.id.videoId, title: String(item.snippet?.title || ''), channel: String(item.snippet?.channelTitle || ''),
    thumbnail: `https://i.ytimg.com/vi/${item.id.videoId}/default.jpg`, youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }))
  for (const result of results) await pool.query(`INSERT INTO wedding_youtube_metadata(video_id,title,channel) VALUES($1,$2,$3)
    ON CONFLICT(video_id) DO UPDATE SET title=excluded.title,channel=excluded.channel,fetched_at=now()`, [result.videoId, result.title, result.channel])
  await pool.query(`INSERT INTO wedding_youtube_cache(query,results,expires_at) VALUES($1,$2,now()+interval '24 hours')
    ON CONFLICT(query) DO UPDATE SET results=excluded.results,expires_at=excluded.expires_at`, [cacheKey, JSON.stringify(results)])
  console.info('youtube_search_ok', { count: budget.count })
  return results
}
export async function cleanYoutube(pool) {
  await pool.query('DELETE FROM wedding_youtube_cache WHERE expires_at<=now()')
  await pool.query("DELETE FROM wedding_youtube_metadata WHERE fetched_at<now()-interval '29 days'")
  await pool.query("DELETE FROM wedding_youtube_daily WHERE day<current_date-32")
  const { rows: [pending] } = await pool.query(`SELECT EXISTS(SELECT 1 FROM wedding_invitations i, jsonb_array_elements(i.songs) s
    WHERE s ? 'youtube' AND (s->'youtube'->>'fetchedAt')::timestamptz<now()-interval '29 days') AS expired`)
  // The invitation table has a statement trigger: even an empty UPDATE marks Sheets dirty.
  if (!pending.expired) return
  await pool.query(`UPDATE wedding_invitations i SET songs=(SELECT jsonb_agg(CASE WHEN s ? 'youtube' AND (s->'youtube'->>'fetchedAt')::timestamptz<now()-interval '29 days' THEN s-'youtube' ELSE s END ORDER BY ord) FROM jsonb_array_elements(i.songs) WITH ORDINALITY a(s,ord))
    WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(i.songs) s WHERE s ? 'youtube' AND (s->'youtube'->>'fetchedAt')::timestamptz<now()-interval '29 days')`)
}
