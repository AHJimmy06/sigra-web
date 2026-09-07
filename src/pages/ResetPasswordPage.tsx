import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, Save } from 'lucide-react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/PageState'
import { clearSpanishValidationMessage, setSpanishValidationMessage } from '@/lib/formValidation'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) { setError('El enlace de recuperación no contiene un token válido.'); return }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true)
    setError('')
    try {
      await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      setSubmitted(true)
      window.setTimeout(() => navigate('/login'), 1800)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No fue posible cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
    <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Volver al inicio de sesión</Link>
    <div className="mb-7"><div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="size-5" /></div><h1 className="text-2xl font-semibold">Cambiar contraseña</h1><p className="mt-2 text-sm text-muted-foreground">Defina una contraseña nueva para recuperar el acceso.</p></div>
    {error && <ErrorState message={error} />}
    {submitted ? <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-900">La contraseña se actualizó correctamente. Será redirigido al inicio de sesión.</div> : <form onSubmit={submit} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="grid gap-4"><label className="grid gap-1 text-sm font-medium">Nueva contraseña <span className="font-normal text-muted-foreground">(obligatorio, mínimo 8 caracteres)</span><input name="password" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border bg-background px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Confirmar contraseña <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="confirmation" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="Repita la nueva contraseña" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="rounded-lg border bg-background px-3 py-2 font-normal" /></label><Button type="submit" disabled={busy}><Save className="size-4" />{busy ? 'Guardando…' : 'Guardar contraseña'}</Button></form>}
  </section></main>
}
