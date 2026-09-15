import { songTitle } from '../../shared/songs.js'
import { useEffect, useState } from 'react'

async function request(body) {
  const response = await fetch('/api/admin', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo completar la operación.'), { status: response.status })
  return data
}
const field = 'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900'
const button = 'rounded-lg bg-[#73573e] px-5 py-3 font-semibold text-white disabled:opacity-50'

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [invitations, setInvitations] = useState([])
  const [group, setGroup] = useState('')
  const [code, setCode] = useState('')
  const [members, setMembers] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function refresh() {
    const data = await request()
    setInvitations(data.invitations)
    setAuthenticated(true)
  }
  useEffect(() => {
    let active = true
    request().then(data => { if (active) { setInvitations(data.invitations); setAuthenticated(true) } })
      .catch(e => { if (active && e.status !== 401) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function run(work) {
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (e) { setError(e.message); if (e.status === 401) { setAuthenticated(false); setInvitations([]) } } finally { setBusy(false) }
  }
  const visible = invitations.filter(i => `${i.group_name} ${i.code} ${i.members.map(m => m.name).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  return <main className="min-h-screen bg-[#fcfaf6] px-4 py-10 text-stone-800">
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm uppercase tracking-widest text-stone-500">Gustavo & Laura</p><h1 className="font-serif text-3xl">Administrar invitaciones</h1></div>
        {authenticated && <button className={button} disabled={busy} onClick={() => run(async () => { await request({ action: 'logout' }); setAuthenticated(false); setInvitations([]) })}>Cerrar sesión</button>}
      </header>
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-green-400 bg-green-50 p-5 font-semibold text-green-900">✓ {message}</div>}
      {loading ? <p role="status">Cargando…</p> : !authenticated ? <form className="max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6" onSubmit={e => { e.preventDefault(); run(async () => { await request({ action: 'login', password }); setPassword(''); await refresh() }) }}>
        <h2 className="font-serif text-xl">Acceso privado</h2>
        <label className="block">Contraseña<input className={field} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className={button} disabled={busy}>{busy ? 'Ingresando…' : 'Entrar'}</button>
      </form> : <>
        <form className="space-y-4 rounded-xl border border-stone-200 bg-white p-6" onSubmit={e => { e.preventDefault(); run(async () => {
          const data = await request({ action: 'create', group, code, members: members.split('\n').map(s => s.trim()).filter(Boolean) })
          setInvitations(previous => [...previous, data.invitation]); setGroup(''); setCode(''); setMembers('')
          setMessage(`Invitación de ${data.invitation.group_name} creada. Código: ${data.invitation.code}. Ya pueden ingresar; la copia de Sheets se actualizará en segundo plano.`)
        }) }}>
          <h2 className="font-serif text-2xl">Nueva invitación</h2>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block">Familia o grupo<input className={field} required maxLength={150} placeholder="Familia García" value={group} onChange={e => setGroup(e.target.value)} /></label>
            <label className="block">Código de invitación<input className={field} required minLength={6} maxLength={32} pattern="[A-Za-z0-9]{6,32}" placeholder="FAMILIAGARCIA" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /><span className="text-sm text-stone-500">Entre 6 y 32 letras o números, sin espacios.</span></label>
            <label className="block">Integrantes (uno por línea)<textarea className={field} required rows={4} value={members} onChange={e => setMembers(e.target.value)} placeholder={'María García\nJuan García'} /></label>
            <button className={button} disabled={busy}>{busy ? 'Guardando…' : 'Crear invitación'}</button>
          </fieldset>
        </form>
        <section className="space-y-4" aria-label="Invitaciones y respuestas">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Invitaciones ({invitations.length})</h2><button className={button} disabled={busy} onClick={() => run(refresh)}>{busy ? 'Espera…' : 'Actualizar respuestas'}</button></div>
          <label className="block">Buscar familia, integrante o código<input type="search" className={field} value={search} onChange={e => setSearch(e.target.value)} /></label>
          {!visible.length && <p>No hay invitaciones para mostrar.</p>}
          {visible.map(i => <article key={i.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-serif text-xl">{i.group_name}{!i.active && ' (inactiva)'}</h3><p>Código: <strong className="break-all">{i.code}</strong></p>
            <ul className="space-y-2">{i.members.map(m => { const answer = i.attendance.find(a => a.id === m.id)?.attending; return <li key={m.id} className="flex flex-wrap justify-between gap-2"><span>{m.name}</span><strong className={answer === true ? 'text-green-800' : answer === false ? 'text-red-800' : 'text-stone-500'}>{answer === true ? '✓ Asistirá' : answer === false ? 'No asistirá' : 'Pendiente'}</strong></li> })}</ul>
            <p className="font-semibold">Canciones sugeridas</p>{i.songs.length ? <ul>{i.songs.map((s, index) => <li key={index}>{songTitle(s)}{s.artist && ` — ${s.artist}`}{s.youtube?.channel && <span> · Canal: {s.youtube.channel}</span>}{s.youtubeUrl && <a className="ml-2 underline" href={s.youtubeUrl} target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>}</li>)}</ul> : <p className="text-stone-500">Sin canciones todavía.</p>}
          </article>)}
        </section>
      </>}
    </div>
  </main>
}
