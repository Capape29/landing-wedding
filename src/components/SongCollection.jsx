import { useRef, useState } from 'react'
import SongPicker from './SongPicker'
import { normalizeSongs, songTitle } from '../../shared/songs.js'

const empty = () => ({ title: '', artist: '' })
function label(song) {
  const element = document.createElement('textarea')
  element.innerHTML = songTitle(song)
  return element.value
}
export default function SongCollection({ songs, onChange, onDraftChange, code, disabled, closed, dirty }) {
  const [draft, setDraft] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [generation, setGeneration] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editor = useRef(null)
  function reset() { setDraft(empty()); setEditing(null); setGeneration(n => n + 1); setError(''); onDraftChange(false) }
  function add(value) {
    try {
      const normalized = normalizeSongs([value])[0]
      if (songs.some((song, index) => index !== editing && (normalized.youtubeUrl ? song.youtubeUrl === normalized.youtubeUrl : !song.youtubeUrl && song.title.toLocaleLowerCase() === normalized.title.toLocaleLowerCase() && song.artist.toLocaleLowerCase() === normalized.artist.toLocaleLowerCase()))) throw new Error('Esta canción ya está en tu lista.')
      if (editing === null && songs.length >= 4) throw new Error('Ya elegiste cuatro canciones. Quita una para agregar otra.')
      const selected = { ...normalized, ...(value.youtube ? { youtube: value.youtube } : {}) }
      onChange(editing === null ? [...songs, selected] : songs.map((song, index) => index === editing ? selected : song))
      setMessage(editing === null ? 'Canción agregada. Recuerda guardar tu lista.' : 'Canción actualizada. Recuerda guardar tu lista.')
      reset()
    } catch (e) { setError(e.message) }
  }
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-lg">Tu lista para el DJ</h3><span className="shrink-0 rounded-full bg-[#f5ead8] px-3 py-1 text-sm">{songs.length} de 4</span></div>
    {!songs.length ? <p className="text-sm text-stone-500">Busca una canción y agrégala a tu lista para empezar.</p> : <ol className="divide-y divide-[#e4d6bf] rounded-xl border border-[#dcccb5] px-3">
      {songs.map((song, index) => <li key={index} className="flex items-start gap-3 py-3">
        <span className="pt-1 text-sm text-stone-500">{index + 1}.</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{label(song)}</p>{song.artist && <p className="text-xs">{song.artist}</p>}
          {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-xs underline">Abrir en YouTube</a>}
          {!closed && <div className="flex flex-wrap gap-4"><button type="button" disabled={disabled} className="min-h-11 text-xs underline disabled:opacity-50" aria-label={`Cambiar canción ${index + 1}`} onClick={() => { setDraft(song); onDraftChange(true); setEditing(index); setGeneration(n => n + 1); setError(''); setMessage(''); requestAnimationFrame(() => editor.current?.querySelector('input')?.focus()) }}>Cambiar</button><button type="button" disabled={disabled} className="min-h-11 text-xs underline disabled:opacity-50" aria-label={`Quitar canción ${index + 1}`} onClick={() => { onChange(songs.filter((_, i) => i !== index)); reset(); setMessage('Canción quitada. Recuerda guardar tu lista.') }}>Quitar</button></div>}
        </div>
      </li>)}
    </ol>}
    {message && dirty && <p role="status" className="text-sm">{message}</p>}
    {!closed && (songs.length < 4 || editing !== null) && <div ref={editor} className="space-y-2">
      <SongPicker key={generation} song={draft} index={0} code={code} onSelect={add} editing={editing !== null} disabled={disabled} />
      {editing !== null && <p className="text-xs">Selecciona un video para reemplazar esta canción.</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {editing !== null && <button type="button" disabled={disabled} className="min-h-11 text-sm underline" onClick={reset}>Cancelar cambio</button>}
    </div>}
    {!closed && songs.length === 4 && editing === null && <p role="status" className="rounded-xl bg-[#f5ead8] p-3 text-sm">Tu lista está completa. Puedes cambiar o quitar canciones antes de guardar.</p>}
  </div>
}
