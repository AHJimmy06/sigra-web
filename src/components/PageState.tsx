export function PageHeader({ title, description }: { title: string; description: string }) { return <header className="mb-7"><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></header> }
export function LoadingState() { return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Cargando…</div> }
export function EmptyState({ children }: { children: string }) { return <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">{children}</div> }
export function ErrorState({ message }: { message: string }) { return <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</div> }
