import { useEffect, useRef, useState } from 'react'
import { songTitle, youtubeUrl } from '../../shared/songs.js'
const field = 'w-full min-w-0 rounded-xl border border-[#d8c9b2] bg-white px-3 py-3 text-sm'
const button = 'min-h-11 rounded-lg border border-[#d8c9b2] px-3 py-2 text-sm disabled:opacity-50'
function decode(value) { const element = document.createElement('textarea'); element.innerHTML = value; return element.value }
export default function SongPicker({ song, index, code, disabled, onSelect, editing }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const sequence = useRef(0)
  const controller = useRef(null)
  useEffect(() => () => { sequence.current++; controller.current?.abort() }, [])
  function cancel() { sequence.current++; controller.current?.abort(); setBusy(false); setResults([]); setMessage('') }
  async function search() {
    cancel()
    if (query.trim().length < 3) { setMessage('Escribe al menos tres caracteres.'); return }
    const current = sequence.current
    controller.current = new AbortController()
    const aborter = controller.current
    const timer = setTimeout(() => aborter.abort(), 8000)
    setBusy(true)
    try {
      const response = await fetch('/api/youtube-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, query }), signal: controller.current.signal })
      const data = await response.json()
      if (current !== sequence.current) return
      if (!response.ok) throw new Error(data.error)
      setResults(data.results)
      if (!data.results.length) setMessage('No encontramos videos. Prueba otro nombre o artista.')
    } catch (error) { if (current === sequence.current) setMessage(error.name === 'AbortError' ? 'La búsqueda tardó demasiado. Inténtalo de nuevo.' : error.message) }
    finally { clearTimeout(timer); if (current === sequence.current) setBusy(false) }
  }
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-xl border border-[#dcccb5] p-3">
    <legend className="px-1 text-sm font-medium">{editing ? 'Cambiar canción' : 'Agregar una canción'}</legend>
    {song.youtubeUrl && <div className="space-y-1 rounded-lg bg-[#f5ead8] p-3 text-sm">
      <p className="break-words font-semibold">{decode(songTitle(song))}</p>
      {song.youtube?.channel && <p>Canal: {decode(song.youtube.channel)}</p>}
      {(() => { try { return <a href={youtubeUrl(song.youtubeUrl)} target="_blank" rel="noopener noreferrer" className="underline">Abrir en YouTube</a> } catch { return null } })()}
    </div>}
    <div className="space-y-3">
      <label htmlFor={`song-${index}-search`} className="block text-sm">Nombre de la canción o artista</label>
      <input id={`song-${index}-search`} className={field} placeholder="Escribe aqui tu cancion o artista y dale a buscar en youtube" value={query} maxLength={150} onChange={e => { cancel(); setQuery(e.target.value) }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search() } }} />
      <button type="button" className={button} disabled={busy} onClick={search}>{busy ? 'Buscando…' : 'Buscar en YouTube'}</button>
      <p role="status" className="text-sm">{message}</p>
      <ul className="space-y-2">{results.map(result => <li key={result.videoId} className="space-y-2 rounded-lg border border-[#dcccb5] p-2">
        <div className="flex items-start gap-2"><img src={result.thumbnail} alt="" width="80" height="60" className="shrink-0" /><div className="min-w-0 text-sm"><p className="break-words font-medium">{decode(result.title)}</p><p className="break-words">Canal: {decode(result.channel)}</p></div></div>
        <button type="button" className="min-h-11 w-full rounded-lg bg-[#355b45] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#254332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#355b45] disabled:opacity-50" aria-label={`Agregar ${decode(result.title)}`} onClick={() => { onSelect({ title: '', artist: '', youtubeUrl: result.youtubeUrl, youtube: { title: result.title, channel: result.channel } }); cancel() }}>{editing ? 'Usar esta canción' : 'Agregar'}</button>
      </li>)}</ul>
    </div>
  </fieldset>
}
