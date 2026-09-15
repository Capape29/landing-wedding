import { randomUUID } from 'node:crypto'
// A durable lease works across pooled connections and expires if a worker is killed.
export async function syncSheets(pool) {
  const token = randomUUID()
  const { rowCount } = await pool.query(`UPDATE wedding_sync_state SET lease_token=$1,lease_until=now()+interval '90 seconds'
    WHERE singleton=true AND (lease_until IS NULL OR lease_until<now())`, [token])
  if (!rowCount) return { busy: true }
  try {
    await pool.query('DELETE FROM wedding_rate_limits WHERE expires_at < now()')
    const { rows: [snapshot] } = await pool.query(`SELECT version::text, synced_version::text,
      (SELECT coalesce(jsonb_agg(i ORDER BY id),'[]') FROM wedding_invitations i WHERE active=true) AS invitations,
      (SELECT row_to_json(c) FROM wedding_config c WHERE singleton=true) AS config
      FROM wedding_sync_state WHERE singleton=true`)
    if (snapshot.version === snapshot.synced_version) return { synced: true, version: snapshot.version }
    if (!snapshot.config) throw new Error('Missing configuration')
    const signal = AbortSignal.timeout(40000)
    let response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      redirect: 'manual',
      body: JSON.stringify({ action: 'mirrorDatabase', secret: process.env.GOOGLE_SCRIPT_SECRET, snapshot }),
      signal,
    })
    if ([302, 303].includes(response.status)) {
      const location = new URL(response.headers.get('location'), process.env.GOOGLE_SCRIPT_URL)
      if (location.protocol !== 'https:' || location.hostname !== 'script.googleusercontent.com' || location.username || location.password || location.port) throw new Error('Unexpected mirror redirect')
      await response.body?.cancel()
      // The POST may already be committed. Retry only Google's response download.
      for (let attempt = 0; attempt < 2; attempt++) {
        response = await fetch(location, { method: 'GET', redirect: 'follow', signal })
        if (response.status !== 404 || attempt === 1) break
        await response.body?.cancel()
      }
    }
    if (!response.ok) { console.warn('sheets_mirror_response_failed', response.status); throw new Error('Mirror delivery failed') }
    const result = await response.json()
    if (result.ok !== true || String(result.version) !== snapshot.version) throw new Error('Mirror not acknowledged')
    await pool.query('UPDATE wedding_sync_state SET synced_version=greatest(synced_version,$1),last_ack_at=now() WHERE singleton=true AND lease_token=$2', [snapshot.version, token])
    return { synced: true, version: snapshot.version }
  } finally {
    await pool.query('UPDATE wedding_sync_state SET lease_token=NULL,lease_until=NULL WHERE singleton=true AND lease_token=$1', [token])
  }
}
