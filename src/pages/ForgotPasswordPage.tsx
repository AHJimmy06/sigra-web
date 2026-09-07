import { useState, type FormEvent } from 'react'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/PageState'
import { validateFieldOnFocus, validateFieldOnInput, validateFieldOnInvalid } from '@/components/FieldFeedback'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setSubmitted(true)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No fue posible procesar la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
    <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Volver al inicio de sesión</Link>
    <div className="mb-7"><div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Mail className="size-5" /></div><h1 className="text-2xl font-semibold">Recuperar acceso</h1><p className="mt-2 text-sm text-muted-foreground">Ingrese su correo y recibirá instrucciones para restablecer su contraseña.</p></div>
    {error && <ErrorState message={error} />}
    {submitted ? <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-900">Si existe una cuenta asociada a este correo, recibirá instrucciones para recuperar el acceso.</div> : <form onSubmit={submit} onInvalid={validateFieldOnInvalid} onInput={validateFieldOnInput} onFocus={validateFieldOnFocus} className="grid gap-4"><label className="grid gap-1 text-sm font-medium">Correo electrónico <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="email" required type="email" autoComplete="email" placeholder="ejemplo@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border bg-background px-3 py-2 font-normal" /></label><Button type="submit" disabled={busy}><Send className="size-4" />{busy ? 'Enviando…' : 'Enviar instrucciones'}</Button></form>}
  </section></main>
}
