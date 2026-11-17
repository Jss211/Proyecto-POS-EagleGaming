import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  FileCheck2,
  Landmark,
  Minus,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react"
import {
  BILLING_PAYMENT_METHODS,
  calculateTaxBreakdown,
  formatCorrelative,
  formatIgvPercent,
  formatMoney,
  type BillingLineItem,
  type BillingPaymentMethod,
  type CustomerDocType,
  type DocumentType,
  type SeriesConfig,
} from "./billing-model"
import { BILLING_DEMO_PRODUCTS, DEMO_RUC_DIRECTORY } from "./billing-demo"

type EmittableType = Exclude<DocumentType, "NOTA_CREDITO">

interface EmitPayload {
  type: EmittableType
  customerName: string
  customerDocType: CustomerDocType
  customerDocNumber: string
  customerAddress?: string
  paymentMethod: BillingPaymentMethod
  items: BillingLineItem[]
  igvRate: number
}

interface BillingEmitModalProps {
  open: boolean
  seriesList: SeriesConfig[]
  defaultIgvRate: number
  onClose: () => void
  onEmit: (payload: EmitPayload) => void
}

const PAYMENT_ICONS: Record<BillingPaymentMethod, typeof Wallet> = {
  Efectivo: Wallet,
  Yape: Smartphone,
  Plin: Smartphone,
  Tarjeta: CreditCard,
  Transferencia: Landmark,
}

const DOC_OPTIONS: {
  type: EmittableType
  title: string
  hint: string
  icon: typeof Receipt
}[] = [
  { type: "TICKET", title: "Ticket", hint: "Venta rápida de mostrador", icon: Receipt },
  { type: "BOLETA", title: "Boleta", hint: "Consumidor final · DNI opcional", icon: User },
  { type: "FACTURA", title: "Factura", hint: "Empresas · RUC e IGV", icon: Building2 },
]

export default function BillingEmitModal({
  open,
  seriesList,
  defaultIgvRate,
  onClose,
  onEmit,
}: BillingEmitModalProps) {
  const [docType, setDocType] = useState<EmittableType>("BOLETA")
  const [customerName, setCustomerName] = useState("")
  const [docNumber, setDocNumber] = useState("")
  const [address, setAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<BillingPaymentMethod>("Yape")
  const [igvRate, setIgvRate] = useState(defaultIgvRate)
  const [selectedProductId, setSelectedProductId] = useState(BILLING_DEMO_PRODUCTS[0].id)
  const [items, setItems] = useState<BillingLineItem[]>([
    {
      id: BILLING_DEMO_PRODUCTS[2].id,
      sku: BILLING_DEMO_PRODUCTS[2].sku,
      name: BILLING_DEMO_PRODUCTS[2].name,
      quantity: 1,
      unitPriceCents: BILLING_DEMO_PRODUCTS[2].unitPriceCents,
    },
  ])
  const [error, setError] = useState<string | null>(null)
  const [lookupHint, setLookupHint] = useState<string | null>(null)

  useEffect(() => {
    if (open) setIgvRate(defaultIgvRate)
  }, [open, defaultIgvRate])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  const activeSeries = useMemo(
    () => seriesList.find(s => s.type === docType),
    [seriesList, docType],
  )

  const totals = useMemo(() => {
    const sum = items.reduce((acc, item) => acc + item.unitPriceCents * item.quantity, 0)
    return calculateTaxBreakdown(sum, igvRate)
  }, [items, igvRate])

  const handleSelectType = (next: EmittableType) => {
    setDocType(next)
    setError(null)
    setLookupHint(null)
    if (next === "TICKET") {
      setCustomerName("")
      setDocNumber("")
      setAddress("")
    }
  }

  const handleAddProduct = () => {
    const product = BILLING_DEMO_PRODUCTS.find(p => p.id === selectedProductId)
    if (!product) return
    setError(null)
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [
        ...prev,
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPriceCents: product.unitPriceCents,
        },
      ]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setItems(prev =>
      prev
        .map(item => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter(item => item.quantity > 0),
    )
  }

  const handleDemoRucLookup = () => {
    const clean = docNumber.replace(/\D/g, "")
    const match = DEMO_RUC_DIRECTORY[clean]
    if (match) {
      setCustomerName(match.name)
      setAddress(match.address)
      setLookupHint("Datos encontrados en padrón DEMO.")
      setError(null)
      return
    }
    const sampleRuc = "20601234567"
    const sample = DEMO_RUC_DIRECTORY[sampleRuc]
    setDocNumber(sampleRuc)
    setCustomerName(sample.name)
    setAddress(sample.address)
    setLookupHint("Se cargó una empresa de ejemplo DEMO.")
    setError(null)
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      setError("Agrega al menos un producto al comprobante.")
      return
    }

    if (docType === "FACTURA") {
      const cleanRuc = docNumber.replace(/\D/g, "")
      if (cleanRuc.length !== 11) {
        setError("Para emitir una Factura DEMO ingresa un RUC de 11 dígitos (o usa Autocompletar DEMO).")
        return
      }
      if (!customerName.trim()) {
        setError("Ingresa la razón social de la empresa.")
        return
      }
    }

    if (docType === "BOLETA" && docNumber.trim()) {
      const cleanDni = docNumber.replace(/\D/g, "")
      if (cleanDni.length !== 8) {
        setError("El DNI debe contener 8 dígitos (o déjalo vacío para Público General).")
        return
      }
    }

    const customerDocType: CustomerDocType =
      docType === "FACTURA"
        ? "RUC"
        : docType === "BOLETA" && docNumber.trim()
          ? "DNI"
          : "SIN_DOC"

    onEmit({
      type: docType,
      customerName: docType === "TICKET" ? "Público General" : customerName.trim() || "Público General",
      customerDocType,
      customerDocNumber: docType === "TICKET" ? "—" : docNumber.replace(/\D/g, "") || "—",
      customerAddress: docType === "FACTURA" ? address.trim() : undefined,
      paymentMethod,
      items,
      igvRate,
    })

    // Reset form for next emit
    setCustomerName("")
    setDocNumber("")
    setAddress("")
    setLookupHint(null)
    setError(null)
    onClose()
  }

  const needsDniAlert = docType === "BOLETA" && totals.totalCents >= 70000 && !docNumber.trim()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="billing-emit-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-emit-title"
          onClick={e => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#ed1450]">
                  <FileCheck2 size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="billing-emit-title" className="font-gaming text-lg font-bold text-zinc-900">
                    Emitir comprobante DEMO
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Siguiente correlativo:{" "}
                    <span className="font-mono font-semibold text-[#cf1045]">
                      {activeSeries ? formatCorrelative(activeSeries.series, activeSeries.nextCorrelative) : "—"}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar formulario"
                className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Document Type Selector */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  1. Tipo de comprobante
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {DOC_OPTIONS.map(({ type, title, hint, icon: Icon }) => {
                    const active = docType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleSelectType(type)}
                        className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                          active
                            ? "border-[#ed1450] bg-rose-50/60"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              active ? "bg-[#ed1450] text-white" : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          {active && (
                            <motion.span
                              layoutId="emit-doc-check"
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ed1450] text-white"
                            >
                              <Check size={12} aria-hidden="true" />
                            </motion.span>
                          )}
                        </div>
                        <p className={`mt-2.5 text-sm font-bold ${active ? "text-[#cf1045]" : "text-zinc-900"}`}>
                          {title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Contextual Receptor Fields */}
              <AnimatePresence mode="wait">
                {docType === "TICKET" ? (
                  <motion.div
                    key="ticket-fields"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600"
                  >
                    <span className="font-semibold text-zinc-900">Emisión directa a Público General.</span>{" "}
                    No se solicitan datos fiscales para agilizar el cobro en mostrador.
                  </motion.div>
                ) : (
                  <motion.div
                    key={docType}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        2. Datos del receptor ({docType === "FACTURA" ? "Obligatorio" : "Opcional"})
                      </p>
                      {docType === "FACTURA" && (
                        <button
                          type="button"
                          onClick={handleDemoRucLookup}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#cf1045] transition-colors hover:bg-rose-50"
                        >
                          <Search size={13} aria-hidden="true" />
                          Autocompletar RUC DEMO
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="block text-xs font-medium text-zinc-600">
                        {docType === "FACTURA" ? "RUC (11 dígitos)" : "DNI (8 dígitos, opcional)"}
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={docType === "FACTURA" ? 11 : 8}
                          value={docNumber}
                          onChange={e => {
                            setDocNumber(e.target.value.replace(/\D/g, ""))
                            setError(null)
                          }}
                          placeholder={docType === "FACTURA" ? "20601234567" : "74829104"}
                          className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#ed1450] focus:outline-none"
                        />
                      </label>
                      <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
                        {docType === "FACTURA" ? "Razón social" : "Nombre completo (opcional)"}
                        <input
                          type="text"
                          value={customerName}
                          onChange={e => {
                            setCustomerName(e.target.value)
                            setError(null)
                          }}
                          placeholder={docType === "FACTURA" ? "Ej. NEXO ESPORTS S.A.C." : "Público General"}
                          className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#ed1450] focus:outline-none"
                        />
                      </label>
                    </div>

                    {docType === "FACTURA" && (
                      <label className="block text-xs font-medium text-zinc-600">
                        Dirección fiscal (opcional)
                        <input
                          type="text"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="Av. Garcilaso de la Vega 1348, Lima"
                          className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#ed1450] focus:outline-none"
                        />
                      </label>
                    )}

                    {lookupHint && (
                      <p className="text-[11px] font-medium text-emerald-700">{lookupHint}</p>
                    )}

                    {needsDniAlert && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          El importe supera S/ 700.00. En operación real ante SUNAT se recomienda consignar el DNI del comprador.
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Product Picker */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  3. Detalle de productos
                </p>
                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                  <select
                    aria-label="Seleccionar producto de demostración"
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="min-h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#ed1450] focus:outline-none"
                  >
                    {BILLING_DEMO_PRODUCTS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatMoney(p.unitPriceCents)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#141419] px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    <Plus size={15} aria-hidden="true" />
                    Agregar ítem
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-900">{item.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            {item.sku} · {formatMoney(item.unitPriceCents)} c/u
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              aria-label={`Disminuir cantidad de ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:text-zinc-900"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-7 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              aria-label={`Aumentar cantidad de ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:text-zinc-900"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <span className="w-24 text-right text-xs font-bold tabular-nums text-zinc-900">
                            {formatMoney(item.unitPriceCents * item.quantity)}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -item.quantity)}
                            aria-label={`Quitar ${item.name}`}
                            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-[#ed1450]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {items.length === 0 && (
                    <p className="rounded-xl border border-dashed border-zinc-300 py-5 text-center text-xs text-zinc-500">
                      Sin ítems agregados. Selecciona un producto gaming arriba para emitir el comprobante.
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Method + Tax Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    4. Medio de pago DEMO
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {BILLING_PAYMENT_METHODS.map(method => {
                      const Icon = PAYMENT_ICONS[method]
                      const active = paymentMethod === method
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                            active
                              ? "border-[#ed1450] bg-rose-50 text-[#cf1045]"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          <Icon size={14} aria-hidden="true" />
                          {method}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-[#141419] p-4 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Resumen tributario DEMO
                    </p>
                    <label className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                      <span>IGV</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        aria-label="Tasa de IGV para este comprobante"
                        value={Math.round(igvRate * 10000) / 100}
                        onChange={e => {
                          const val = Math.max(0, Math.min(30, Number(e.target.value) || 0))
                          setIgvRate(Math.round(val * 100) / 10000)
                        }}
                        className="w-11 bg-transparent text-right font-mono font-bold text-white focus:outline-none"
                      />
                      <span>%</span>
                    </label>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Op. Gravada (Base)</span>
                      <span className="tabular-nums text-zinc-200">{formatMoney(totals.subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>IGV ({formatIgvPercent(igvRate)})</span>
                      <span className="tabular-nums text-zinc-200">{formatMoney(totals.igvCents)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2.5 text-base font-bold">
                      <span>Total</span>
                      <span className="font-gaming tabular-nums text-[#ed1450]">
                        {formatMoney(totals.totalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-[#cf1045]">
                  <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <p className="text-[11px] text-zinc-500">
                Emisión simulada localmente sin envío a SUNAT.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ed1450] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#d01046]"
                >
                  <FileCheck2 size={15} aria-hidden="true" />
                  Emitir {docType === "TICKET" ? "Ticket" : docType === "BOLETA" ? "Boleta" : "Factura"} DEMO
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
