import type { ReactNode } from 'react'

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></div>{action}</header> }
export function LoadingState() { return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Cargando…</div> }
export function EmptyState({ children }: { children: string }) { return <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">{children}</div> }
export function ErrorState({ message, onRetry = () => window.location.reload() }: { message: string; onRetry?: () => void }) { return <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><span>{message}</span><button type="button" className="rounded-md border px-3 py-1 font-medium" onClick={onRetry}>Reintentar</button></div> }
