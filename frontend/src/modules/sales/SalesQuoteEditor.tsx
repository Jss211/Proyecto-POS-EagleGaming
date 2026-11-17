import { useEffect, useState } from "react"
import { ShoppingCart } from "lucide-react"
import SalesWorkspace from "./SalesWorkspace"
import SalesDialog from "./SalesDialog"
import useSalesCart from "./useSalesCart"
import { defaultQuoteExpiry } from "./sales-model"
import type { DemoQuote } from "./sales-records"
import type { OperationResult, QuoteInput } from "./sales-storage"
import type { DemoProduct } from "./sales-demo"

export default function SalesQuoteEditor({ products, quote, onSave, onClose }: { products: readonly DemoProduct[]; quote?: DemoQuote; onSave: (input: QuoteInput) => OperationResult<DemoQuote>; onClose: () => void }) {
  const draft = useSalesCart(products, quote?.lines.map(line => ({ productId: line.productId, quantity: line.quantity })) ?? [], quote ? `${Math.floor(quote.discountCents / 100)}.${String(quote.discountCents % 100).padStart(2, "0")}` : "")
  const [clientName, setClientName] = useState(quote?.client.startsWith("DEMO · ") ? quote.client.slice(7) : "")
  const [namedClient, setNamedClient] = useState(!!clientName)
  const [notes, setNotes] = useState(quote?.notes ?? "")
  const [expiresOn, setExpiresOn] = useState(quote?.expiresOn ?? defaultQuoteExpiry())
  const [status, setStatus] = useState<DemoQuote["status"]>(quote?.status ?? "Borrador")
  const [error, setError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const signature = JSON.stringify([draft.items, draft.discount, clientName, namedClient, notes, expiresOn, status])
  const [original] = useState(signature)
  const dirty = signature !== original
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const save = () => {
    if (namedClient && !clientName.trim()) { setError("Ingresa un nombre ficticio o selecciona Cliente mostrador."); return }
    const result = onSave({ id: quote?.id, summary: draft.summary, clientName: namedClient ? clientName : "", notes, expiresOn, status })
    if (!result.ok) setError(result.error)
  }
  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{quote ? `Editar ${quote.number}` : "Nueva cotización DEMO"}</h3><p className="mt-2 text-xs leading-6 text-zinc-500">Selecciona productos y guarda una propuesta local. {quote ? "Al guardar se aplican los precios y la disponibilidad actuales del catálogo DEMO." : "No crea ventas ni reserva productos."}</p></div><div className="flex flex-wrap gap-2"><button type="button" className="sales-button sales-button-secondary text-xs" onClick={() => { const cart = document.getElementById("quote-cart"); cart?.focus(); cart?.scrollIntoView({ block: "start" }) }}><ShoppingCart size={15} aria-hidden="true" />Ver selección</button><button type="button" onClick={() => dirty ? setConfirmDiscard(true) : onClose()} className="sales-button sales-button-secondary text-xs">Volver al listado</button></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sales-field">Cliente DEMO<select value={namedClient ? "named" : "counter"} onChange={event => setNamedClient(event.target.value === "named")} className="sales-input mt-1"><option value="counter">Cliente mostrador</option><option value="named">Nombre ficticio de demostración</option></select></label>{namedClient && <label className="sales-field">Nombre ficticio<input value={clientName} maxLength={80} onChange={event => setClientName(event.target.value)} placeholder="Ej.: Cliente de prueba" autoComplete="off" className="sales-input mt-1" /><span className="mt-1 block text-[11px] text-zinc-500">No ingreses nombres ni datos personales reales.</span></label>}
        <label className="sales-field">Vencimiento · Lima<input type="date" value={expiresOn} onChange={event => setExpiresOn(event.target.value)} className="sales-input mt-1" /></label><label className="sales-field">Estado de la cotización<select value={status} onChange={event => setStatus(event.target.value as DemoQuote["status"])} className="sales-input mt-1"><option>Borrador</option><option>Vigente</option></select><span className="mt-1 block text-[11px] text-zinc-500">Una cotización vigente pasa a vencida al terminar su fecha de vencimiento en Lima.</span></label>
        <label className="sales-field sm:col-span-2">Observaciones de demostración<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="Solo anotaciones ficticias, sin información personal." className="sales-input mt-1 resize-y" /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-[#cf1045]">{error} Tus cambios se conservan.</p>}
    </section>
    <SalesWorkspace draft={draft} onSubmit={save} cartId="quote-cart" actionLabel="Guardar cotización DEMO" actionNote="Solo se guarda en este navegador. No registra ventas ni pagos." />
    {confirmDiscard && <SalesDialog title="¿Descartar cambios de la cotización?" onClose={() => setConfirmDiscard(false)} footer={<><button type="button" onClick={() => setConfirmDiscard(false)} className="sales-button sales-button-secondary">Seguir editando</button><button type="button" onClick={onClose} className="sales-button sales-button-primary">Descartar cambios</button></>}><p className="text-sm leading-6 text-zinc-500">Hay cambios sin guardar. El registro previamente guardado, si existe, se conserva.</p></SalesDialog>}
  </div>
}
