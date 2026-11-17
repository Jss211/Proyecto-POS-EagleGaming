import { useEffect, useRef, useState } from "react"
import { CreditCard, Wallet, Landmark, Smartphone, Check } from "lucide-react"
import { CartTotals } from "./SalesCart"
import SalesDialog from "./SalesDialog"
import { SalesRecordLines } from "./SalesRecordDetail"
import { cashPayment, formatSalesMoney, paymentMethods, type CartSummary, type PaymentMethod } from "./sales-model"
import type { DemoSale } from "./sales-records"
import type { OperationResult } from "./sales-storage"

const paymentIcons = { Efectivo: Wallet, Tarjeta: CreditCard, Transferencia: Landmark, Yape: Smartphone, Plin: Smartphone }

export default function SalesCheckout({ open, summary, onClose, onConfirm }: { open: boolean; summary: CartSummary; onClose: () => void; onConfirm: (method: PaymentMethod, received: string) => OperationResult<DemoSale> }) {
  const [method, setMethod] = useState<PaymentMethod>("Efectivo")
  const [received, setReceived] = useState("")
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  useEffect(() => { if (open) { pending.current = false; setSaving(false) } }, [open])
  const cash = cashPayment(received, summary.totalCents)
  const showCashError = method === "Efectivo" && (touched || received !== "") && cash.error
  const invalid = !summary.lines.length || !!summary.discountError || !!summary.cartError || (method === "Efectivo" && !!cash.error)
  const confirm = () => {
    if (pending.current || invalid) return
    pending.current = true
    setSaving(true)
    const result = onConfirm(method, received)
    if (!result.ok) { setError(result.error); pending.current = false; setSaving(false); return }
    setError(null); setReceived(""); setMethod("Efectivo"); setTouched(false)
    onClose()
  }
  return <SalesDialog open={open} title="Cobro de demostración" onClose={onClose} footer={<><button type="button" onClick={onClose} className="sales-button sales-button-secondary">Volver al carrito</button><button type="button" disabled={invalid || saving} onClick={confirm} className="sales-button sales-button-primary"><Check size={17} aria-hidden="true" />{saving ? "Guardando localmente…" : "Registrar venta DEMO"}</button></>}>
    <p className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-[#cf1045]">Esta confirmación guarda únicamente una venta DEMO en este navegador y actualiza su stock de demostración. No cobra dinero, no modifica inventario real ni emite comprobantes fiscales.</p>
    <h4 className="mt-5 text-sm font-semibold">Resumen de productos</h4><SalesRecordLines lines={summary.lines.map(line => ({ productId: line.id, name: line.name, sku: line.sku, quantity: line.quantity, unitPriceCents: line.priceCents }))} /><div className="mt-4"><CartTotals summary={summary} /></div>
    <fieldset className="mt-6"><legend className="text-sm font-semibold">Método de pago DEMO</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{paymentMethods.map(name => {
      const Icon = paymentIcons[name]
      return <label key={name} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs ${method === name ? "border-[#ed1450] bg-rose-50 font-semibold text-[#cf1045]" : "border-zinc-200 text-zinc-600"}`}><input type="radio" name="sales-payment-method" value={name} checked={method === name} onChange={() => { setMethod(name); setError(null) }} className="h-4 w-4 shrink-0 accent-[#ed1450]" /><Icon size={16} className="shrink-0" aria-hidden="true" />{name}</label>
    })}</div></fieldset>
    {method === "Efectivo" && <div className="mt-5 rounded-xl bg-zinc-50 p-4"><label htmlFor="sales-cash-received" className="text-xs font-medium text-zinc-600">Monto recibido de ejemplo (S/)<input id="sales-cash-received" type="text" inputMode="decimal" autoComplete="off" value={received} onChange={event => { setReceived(event.target.value); setError(null) }} onBlur={() => setTouched(true)} placeholder="0.00" aria-invalid={!!showCashError} aria-describedby={showCashError ? "sales-cash-error" : "sales-cash-help"} className="sales-input mt-1" /></label><p id="sales-cash-help" className="mt-2 text-[11px] text-zinc-500">Usa hasta dos decimales. No se recibe dinero real.</p>{showCashError && <p id="sales-cash-error" role="alert" className="mt-2 text-xs text-[#cf1045]">{cash.error}</p>}<p role="status" className="mt-4 flex flex-wrap justify-between gap-2 text-sm"><span className="text-zinc-500">Vuelto DEMO</span><span className="font-semibold tabular-nums">{cash.changeCents === null ? "—" : formatSalesMoney(cash.changeCents)}</span></p></div>}
    {method !== "Efectivo" && <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-xs leading-6 text-zinc-500">{method} es un método de ejemplo. No se solicitan datos bancarios ni se conecta ninguna pasarela.</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-[#cf1045]">{error} El carrito se conserva; puedes reintentar.</p>}
    <p className="mt-4 text-xs leading-6 text-zinc-500">Puedes cerrar este panel y volver a abrirlo sin perder el método y el monto ingresados mientras permanezcas en Ventas.</p>
  </SalesDialog>
}
