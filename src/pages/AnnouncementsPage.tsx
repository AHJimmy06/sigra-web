import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
interface Announcement { id: string; title: string; body: string; publishedAt: string | null }
export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => api<Announcement[]>('/announcements').then(setItems).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); useEffect(() => { void load() }, [])
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api('/announcements', { method: 'POST', body: JSON.stringify({ title: data.get('title'), body: data.get('body'), published: data.get('published') === 'on' }) }); event.currentTarget.reset(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to publish announcement') } }
  async function setPublished(item: Announcement, published: boolean) { await api(`/announcements/${item.id}`, { method: 'PATCH', body: JSON.stringify({ published }) }); await load() }
  return <><PageHeader title="Digital bulletin" description="Draft and publish plain-text announcements for residents." />{error && <ErrorState message={error} />}
    <form onSubmit={create} className="mb-6 space-y-3 rounded-xl border bg-card p-4"><input name="title" required maxLength={160} placeholder="Announcement title" className="w-full rounded-lg border px-3 py-2" /><textarea name="body" required rows={4} placeholder="Plain-text message" className="w-full rounded-lg border px-3 py-2" /><div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><input name="published" type="checkbox" />Publish immediately</label><Button>Create announcement</Button></div></form>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No announcements yet.</EmptyState> : <div className="grid gap-4">{items.map((item) => <article key={item.id} className="rounded-xl border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{item.publishedAt ? 'Published' : 'Draft'}</span></div><Button className="mt-4" variant="outline" size="sm" onClick={() => void setPublished(item, !item.publishedAt)}>{item.publishedAt ? 'Unpublish' : 'Publish'}</Button></article>)}</div>}
  </>
}
