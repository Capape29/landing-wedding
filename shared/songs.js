export function youtubeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Pega un enlace válido de un video de YouTube.')
  let url
  try { url = new URL(value.trim()) } catch { throw new Error('Pega un enlace completo de YouTube (https://…).') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Enlace de YouTube inválido.')
  let id
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[2]
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) throw new Error('Usa el enlace de un video de YouTube, no de un canal o playlist.')
  return `https://www.youtube.com/watch?v=${id}`
}
export const hasSong = song => !!(song.title?.trim() || song.artist?.trim() || song.youtubeUrl?.trim())
export function normalizeSongs(songs) {
  if (!Array.isArray(songs) || songs.length > 4) throw new Error('Puedes guardar hasta cuatro canciones.')
  return songs.map(song => {
    if (!song || typeof song.title !== 'string' || typeof song.artist !== 'string' || song.title.length > 150 || song.artist.length > 150) throw new Error('Título y artista deben tener hasta 150 caracteres.')
    const result = { title: song.title.trim(), artist: song.artist.trim() }
    if (song.youtubeUrl) result.youtubeUrl = youtubeUrl(song.youtubeUrl)
    else if (!result.title || !result.artist) throw new Error('Completa el título y artista de cada canción, o pega un enlace de YouTube.')
    return result
  })
}
export function sameSongs(a, b) {
  try { return JSON.stringify(normalizeSongs(a)) === JSON.stringify(normalizeSongs(b)) } catch { return false }
}
export function songTitle(song) { return song.title || song.youtube?.title || (song.youtubeUrl ? 'Video de YouTube' : '') }
