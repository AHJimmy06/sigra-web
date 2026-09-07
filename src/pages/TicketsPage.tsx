import { useEffect, useMemo, useState } from "react";
import { Clock3, Eye, FileImage, Filter, Search, X } from "lucide-react";
import { api } from "@/api/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
interface Ticket {
  id: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
}
interface TicketDetail extends Ticket {
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  resident?: { name: string; email?: string };
  attachments?: {
    id: string;
    name: string;
    url: string;
    contentType: string;
  }[];
  history?: {
    id: string;
    from: Ticket["status"] | null;
    to: Ticket["status"];
    createdAt: string;
    actorName?: string;
  }[];
}
const statusLabels: Record<Ticket["status"], string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resuelta",
};
const priorityLabels: Record<NonNullable<TicketDetail["priority"]>, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};
const nextStatuses: Record<Ticket["status"], Ticket["status"][]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
};
export function TicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{
    item: Ticket;
    status: Ticket["status"];
  } | null>(null);
  const load = () =>
    api<PaginatedResponse<Ticket> | Ticket[]>("/tickets")
      .then((res) => {
        setItems(Array.isArray(res) ? res : res.items);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  async function openDetail(item: Ticket) {
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await api<TicketDetail>(`/tickets/${item.id}`));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible cargar el detalle de la incidencia.",
      );
    } finally {
      setDetailLoading(false);
    }
  }
  async function update(item: Ticket, status: Ticket["status"]) {
    setUpdatingId(item.id);
    setError("");
    try {
      await api(`/tickets/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      if (detail?.id === item.id) setDetail({ ...detail, status });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible actualizar la incidencia.",
      );
    } finally {
      setUpdatingId("");
    }
  }
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery =
          !query.trim() ||
          item.description
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase());
        const matchesStatus =
          statusFilter === "ALL" || item.status === statusFilter;
        const matchesPriority =
          priorityFilter === "ALL" || item.priority === priorityFilter;
        return matchesQuery && matchesStatus && matchesPriority;
      }),
    [items, query, statusFilter, priorityFilter],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  return (
    <>
      <PageHeader
        title="Incidencias de mantenimiento"
        description="Revise las incidencias de los residentes y supervise su estado de resolución."
      />
      {error && <ErrorState message={error} />}
      <section
        className="mb-6 rounded-xl border bg-card p-4"
        aria-label="Filtros de incidencias"
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4" />
          Buscar y filtrar incidencias
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative">
            <span className="sr-only">Buscar incidencia</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Ej. Fuga de agua o ascensor"
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            >
              <option value="ALL">Todos los estados</option>
              <option value="OPEN">Abiertas</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="RESOLVED">Resueltas</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por prioridad</span>
            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            >
              <option value="ALL">Todas las prioridades</option>
              <option value="URGENT">Urgentes</option>
              <option value="HIGH">Altas</option>
              <option value="MEDIUM">Medias</option>
              <option value="LOW">Bajas</option>
            </select>
          </label>
        </div>
      </section>
      {loading ? (
        <LoadingState />
      ) : filteredItems.length === 0 ? (
        <EmptyState>
          {items.length === 0
            ? "No se han registrado incidencias de mantenimiento."
            : "No hay incidencias que coincidan con los filtros seleccionados."}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3">
            {paginatedItems.map((item) => (
              <article key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(item.createdAt).toLocaleString("es")}
                      </span>
                      {item.priority && (
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          Prioridad {priorityLabels[item.priority]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openDetail(item)}
                    >
                      <Eye className="size-4" />
                      Ver detalle
                    </Button>
                    <select
                      aria-label={`Estado de la incidencia: ${item.description}`}
                      className="cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm"
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(event) =>
                        setPendingStatus({
                          item,
                          status: event.target.value as Ticket["status"],
                        })
                      }
                    >
                      <option value={item.status}>
                        {statusLabels[item.status]}
                      </option>
                      {nextStatuses[item.status].map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filteredItems.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalle de incidencia"
        description={
          detail
            ? `Registrada el ${new Date(detail.createdAt).toLocaleString("es")}`
            : undefined
        }
      >
        {detailLoading ? (
          <LoadingState />
        ) : (
          detail && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="mt-1 whitespace-pre-wrap">{detail.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="mt-1 font-medium">
                    {statusLabels[detail.status]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridad</p>
                  <p className="mt-1 font-medium">
                    {detail.priority
                      ? priorityLabels[detail.priority]
                      : "No definida"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Residente</p>
                  <p className="mt-1 font-medium">
                    {detail.resident?.name ?? "No disponible"}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium">
                  <FileImage className="size-4" />
                  Archivos adjuntos
                </h3>
                {detail.attachments?.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                        >
                          {attachment.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No hay archivos adjuntos.
                  </p>
                )}
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium">
                  <Clock3 className="size-4" />
                  Historial
                </h3>
                {detail.history?.length ? (
                  <ol className="mt-2 space-y-2 text-sm">
                    {detail.history.map((entry) => (
                      <li key={entry.id} className="border-l-2 pl-3">
                        <p>
                          {entry.from ? statusLabels[entry.from] : "Creada"} →{" "}
                          {statusLabels[entry.to]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("es")}
                          {entry.actorName ? ` · ${entry.actorName}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aún no hay cambios registrados.
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetail(null)}
                >
                  <X className="size-4" />
                  Cerrar
                </Button>
              </div>
            </div>
          )
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => {
          if (pendingStatus)
            void update(pendingStatus.item, pendingStatus.status);
        }}
        busy={Boolean(pendingStatus && updatingId === pendingStatus.item.id)}
        title="Actualizar incidencia"
        description={
          pendingStatus
            ? `¿Desea cambiar la incidencia a “${statusLabels[pendingStatus.status]}”?`
            : ""
        }
        confirmLabel="Confirmar cambio"
      />
    </>
  );
}
