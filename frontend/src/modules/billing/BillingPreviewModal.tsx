import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Ban,
  Check,
  Copy,
  FileText,
  Printer,
  Receipt,
  ShieldCheck,
  X,
} from "lucide-react"
import {
  DOCUMENT_TYPE_META,
  STATUS_META,
  formatBillingDateTime,
  formatIgvPercent,
  formatMoney,
  type BillingEmitterConfig,
  type DemoInvoice,
} from "./billing-model"
import {
  DemoBarcodeSvg,
  DemoQrSvg,
  EagleCrestSvg,
  ThermalTearEdgeSvg,
} from "./BillingSvgGraphics"

export type PreviewFormat = "ticket" | "a4"

function buildQrPayload(invoice: DemoInvoice, emitter: BillingEmitterConfig): string {
  const igvLabel = formatIgvPercent(invoice.igvRate ?? emitter.igvRate)
  const docLine =
    invoice.customerDocNumber !== "—"
      ? `${invoice.customerDocType}: ${invoice.customerDocNumber}`
      : "SIN DOC"
  return [
    emitter.tradeName,
    `RUC: ${emitter.ruc}`,
    `DOC: ${invoice.number} (${DOCUMENT_TYPE_META[invoice.type].shortLabel})`,
    `FECHA: ${formatBillingDateTime(invoice.issuedAt)}`,
    `CLIENTE: ${invoice.customerName} (${docLine})`,
    `TOTAL: ${formatMoney(invoice.totalCents)} | IGV ${igvLabel}: ${formatMoney(invoice.igvCents)}`,
    `ESTADO: ${STATUS_META[invoice.status].label.toUpperCase()}`,
  ].join("\n")
}

interface BillingPreviewModalProps {
  invoice: DemoInvoice | null
  initialFormat?: PreviewFormat
  emitter: BillingEmitterConfig
  onClose: () => void
  onRequestVoid: (invoice: DemoInvoice) => void
}

export default function BillingPreviewModal({
  invoice,
  initialFormat = "ticket",
  emitter,
  onClose,
  onRequestVoid,
}: BillingPreviewModalProps) {
  const [format, setFormat] = useState<PreviewFormat>(initialFormat)
  const [copied, setCopied] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printDone, setPrintDone] = useState(false)

  useEffect(() => {
    setFormat(initialFormat)
    setCopied(false)
    setPrinting(false)
    setPrintDone(false)
  }, [invoice, initialFormat])

  useEffect(() => {
    if (!invoice) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [invoice, onClose])

  const handleCopySummary = async () => {
    if (!invoice) return
    const typeLabel = DOCUMENT_TYPE_META[invoice.type].label
    const lines = invoice.items
      .map(item => `- ${item.quantity}x ${item.name} (${formatMoney(item.unitPriceCents * item.quantity)})`)
      .join("\n")
    const text = [
      `${emitter.tradeName} · ${typeLabel}`,
      `Comprobante: ${invoice.number}`,
      `Fecha: ${formatBillingDateTime(invoice.issuedAt)}`,
      `Receptor: ${invoice.customerName}${invoice.customerDocNumber !== "—" ? ` (${invoice.customerDocType}: ${invoice.customerDocNumber})` : ""}`,
      `Detalle:\n${lines}`,
      `Total: ${formatMoney(invoice.totalCents)} · Pago: ${invoice.paymentMethod}`,
      `Hash DEMO: ${invoice.hashCode}`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard fallback ignored in restricted contexts.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  const handleSimulatePrint = () => {
    if (printing) return
    setPrinting(true)
    setPrintDone(false)
    window.setTimeout(() => {
      setPrinting(false)
      setPrintDone(true)
      window.setTimeout(() => setPrintDone(false), 2600)
    }, 950)
  }

  return (
    <AnimatePresence>
      {invoice && (
        <motion.div
          key="billing-preview-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-preview-title"
          onClick={e => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#f6f6f9] shadow-2xl"
          >
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#ed1450]">
                  {format === "ticket" ? <Receipt size={20} aria-hidden="true" /> : <FileText size={20} aria-hidden="true" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="billing-preview-title" className="font-gaming text-base font-bold text-zinc-900">
                      {invoice.number}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[invoice.status].badgeClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[invoice.status].dotClass}`} />
                      {STATUS_META[invoice.status].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {DOCUMENT_TYPE_META[invoice.type].label} · Vista previa de demostración
                  </p>
                </div>
              </div>

              {/* Format Switcher */}
              <div className="flex items-center gap-2">
                <div className="relative flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
                  {([
                    { id: "ticket", label: "Ticket 80mm", icon: Receipt },
                    { id: "a4", label: "Formato A4", icon: FileText },
                  ] as const).map(({ id, label, icon: Icon }) => {
                    const active = format === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormat(id)}
                        className={`relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active ? "text-white" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="billing-preview-format-pill"
                            transition={{ type: "spring", stiffness: 450, damping: 34 }}
                            className="absolute inset-0 -z-10 rounded-lg bg-[#141419]"
                          />
                        )}
                        <Icon size={14} aria-hidden="true" />
                        {label}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar vista previa"
                  className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Print feedback bar */}
            <AnimatePresence>
              {(printing || printDone) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-rose-200 bg-rose-50"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs font-semibold text-[#cf1045]">
                    <span className="inline-flex items-center gap-2">
                      {printing ? (
                        <Printer size={15} className="animate-bounce" aria-hidden="true" />
                      ) : (
                        <Check size={15} aria-hidden="true" />
                      )}
                      {printing
                        ? format === "ticket"
                          ? "Enviando a impresora térmica DEMO (80mm)..."
                          : "Generando vista de impresión A4 DEMO..."
                        : format === "ticket"
                          ? "Impresión térmica DEMO completada correctamente."
                          : "Documento A4 DEMO preparado para impresión."}
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                      Simulación local
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <AnimatePresence mode="wait">
                {format === "ticket" ? (
                  <motion.div
                    key="ticket-view"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{
                      opacity: 1,
                      y: printing ? [0, -8, 0] : 0,
                    }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                    className="mx-auto w-full max-w-[348px]"
                  >
                    <div className="drop-shadow-[0_14px_28px_rgba(20,20,25,0.12)]">
                      <ThermalTearEdgeSvg />
                      <div className="relative bg-white px-6 py-5 font-mono text-xs text-zinc-800">
                        {invoice.status === "ANULADO" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="-rotate-12 rounded-lg border-2 border-[#ed1450]/40 bg-white/85 px-4 py-1.5 font-gaming text-2xl font-bold tracking-widest text-[#ed1450]/70">
                              ANULADO
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col items-center text-center">
                          <EagleCrestSvg className="h-10 w-10" />
                          <p className="mt-2 font-gaming text-sm font-bold tracking-wide text-zinc-900">
                            {emitter.tradeName}
                          </p>
                          <p className="text-[11px] font-semibold text-zinc-600">{emitter.businessName}</p>
                          <p className="text-[11px] text-zinc-500">R.U.C. {emitter.ruc}</p>
                          <p className="mt-1 text-[10px] leading-4 text-zinc-500">{emitter.address}</p>
                          <p className="text-[10px] text-zinc-500">Tel: {emitter.phone}</p>
                        </div>

                        <div className="my-4 border-y border-dashed border-zinc-300 py-2.5 text-center">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                            {DOCUMENT_TYPE_META[invoice.type].label}
                          </p>
                          <p className="mt-0.5 text-sm font-bold tracking-wider text-[#ed1450]">
                            {invoice.number}
                          </p>
                        </div>

                        <dl className="space-y-1 text-[11px]">
                          <div className="flex justify-between gap-2">
                            <dt className="text-zinc-500">Fecha:</dt>
                            <dd className="text-right font-medium">{formatBillingDateTime(invoice.issuedAt)}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-zinc-500">Receptor:</dt>
                            <dd className="max-w-[190px] truncate text-right font-medium">{invoice.customerName}</dd>
                          </div>
                          {invoice.customerDocNumber !== "—" && (
                            <div className="flex justify-between gap-2">
                              <dt className="text-zinc-500">{invoice.customerDocType}:</dt>
                              <dd className="text-right font-medium">{invoice.customerDocNumber}</dd>
                            </div>
                          )}
                          <div className="flex justify-between gap-2">
                            <dt className="text-zinc-500">Pago:</dt>
                            <dd className="text-right font-medium">{invoice.paymentMethod}</dd>
                          </div>
                          {invoice.relatedNumber && (
                            <div className="flex justify-between gap-2 text-amber-700">
                              <dt>Ref. doc:</dt>
                              <dd className="text-right font-semibold">{invoice.relatedNumber}</dd>
                            </div>
                          )}
                        </dl>

                        <div className="my-3 border-t border-dashed border-zinc-300 pt-3">
                          <div className="mb-2 flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                            <span>Cant · Producto</span>
                            <span>Importe</span>
                          </div>
                          <ul className="space-y-2">
                            {invoice.items.map(item => (
                              <li key={item.id} className="flex items-start justify-between gap-2 text-[11px]">
                                <div className="min-w-0">
                                  <p className="font-semibold text-zinc-900">
                                    {item.quantity}x {item.name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    {item.sku} · {formatMoney(item.unitPriceCents)} c/u
                                  </p>
                                </div>
                                <span className="shrink-0 font-semibold tabular-nums">
                                  {formatMoney(item.unitPriceCents * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-t border-dashed border-zinc-300 pt-3 text-[11px]">
                          <div className="flex justify-between py-0.5 text-zinc-500">
                            <span>OP. GRAVADA</span>
                            <span className="tabular-nums">{formatMoney(invoice.subtotalCents)}</span>
                          </div>
                          <div className="flex justify-between py-0.5 text-zinc-500">
                            <span>IGV ({formatIgvPercent(invoice.igvRate ?? emitter.igvRate)})</span>
                            <span className="tabular-nums">{formatMoney(invoice.igvCents)}</span>
                          </div>
                          <div className="mt-1.5 flex justify-between border-t border-zinc-900 pt-2 text-sm font-bold text-zinc-900">
                            <span>TOTAL</span>
                            <span className="tabular-nums">{formatMoney(invoice.totalCents)}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col items-center border-t border-dashed border-zinc-300 pt-4 text-center">
                          <DemoQrSvg value={buildQrPayload(invoice, emitter)} size={136} />
                          <p className="mt-2 break-all text-[9px] text-zinc-400">
                            Hash DEMO: {invoice.hashCode}
                          </p>
                          <div className="mt-3 w-full flex justify-center">
                            <DemoBarcodeSvg value={invoice.number} />
                          </div>
                          <p className="mt-3 text-[10px] leading-4 text-zinc-500">{emitter.ticketFooter}</p>
                          <p className="mt-2 rounded bg-zinc-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                            Comprobante demostrativo · Sin validez tributaria
                          </p>
                        </div>
                      </div>
                      <ThermalTearEdgeSvg flip />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="a4-view"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                    className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-lg sm:p-10"
                  >
                    {invoice.status === "ANULADO" && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-12 rounded-xl border-4 border-[#ed1450]/30 bg-white/80 px-8 py-3 font-gaming text-4xl font-bold tracking-[0.2em] text-[#ed1450]/60">
                          ANULADO
                        </span>
                      </div>
                    )}

                    {/* Top Header */}
                    <div className="flex flex-col justify-between gap-6 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-4">
                        <EagleCrestSvg className="h-14 w-14 shrink-0" />
                        <div>
                          <h4 className="font-gaming text-xl font-bold tracking-wide text-zinc-900">
                            {emitter.tradeName}
                          </h4>
                          <p className="text-xs font-semibold text-zinc-700">{emitter.businessName}</p>
                          <p className="mt-1 text-xs text-zinc-500">{emitter.address}</p>
                          <p className="text-xs text-zinc-500">Central telefónica: {emitter.phone}</p>
                        </div>
                      </div>

                      <div className="min-w-[230px] rounded-xl border-2 border-[#141419] bg-zinc-50/70 p-4 text-center">
                        <p className="text-xs font-bold tracking-wider text-zinc-600">R.U.C. {emitter.ruc}</p>
                        <p className="mt-1.5 rounded bg-[#141419] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                          {DOCUMENT_TYPE_META[invoice.type].label}
                        </p>
                        <p className="mt-2 font-gaming text-lg font-bold tracking-wider text-[#ed1450]">
                          {invoice.number}
                        </p>
                      </div>
                    </div>

                    {/* Customer & Meta Grid */}
                    <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-xs sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Datos del receptor
                        </p>
                        <p className="text-sm font-semibold text-zinc-900">{invoice.customerName}</p>
                        <p className="text-zinc-600">
                          <span className="font-semibold text-zinc-700">
                            {invoice.customerDocType === "SIN_DOC" ? "Documento:" : `${invoice.customerDocType}:`}
                          </span>{" "}
                          {invoice.customerDocNumber}
                        </p>
                        {invoice.customerAddress && (
                          <p className="text-zinc-500">{invoice.customerAddress}</p>
                        )}
                      </div>

                      <div className="space-y-1.5 sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Información de emisión
                        </p>
                        <p className="text-zinc-700">
                          <span className="text-zinc-500">Emisión:</span>{" "}
                          <span className="font-semibold">{formatBillingDateTime(invoice.issuedAt)}</span>
                        </p>
                        <p className="text-zinc-700">
                          <span className="text-zinc-500">Moneda:</span>{" "}
                          <span className="font-semibold">SOLES (PEN)</span>
                        </p>
                        <p className="text-zinc-700">
                          <span className="text-zinc-500">Forma de pago:</span>{" "}
                          <span className="font-semibold">{invoice.paymentMethod}</span>
                        </p>
                        {invoice.relatedNumber && (
                          <p className="font-semibold text-amber-700">
                            Comprobante modificado: {invoice.relatedNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
                      <table className="w-full min-w-[480px] text-left text-xs">
                        <thead className="bg-[#141419] text-[11px] uppercase tracking-wider text-zinc-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold">SKU</th>
                            <th className="px-4 py-3 font-semibold">Descripción</th>
                            <th className="px-4 py-3 text-center font-semibold">Cant.</th>
                            <th className="px-4 py-3 text-right font-semibold">P. Unit.</th>
                            <th className="px-4 py-3 text-right font-semibold">Importe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {invoice.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{item.sku}</td>
                              <td className="px-4 py-3 font-medium text-zinc-900">{item.name}</td>
                              <td className="px-4 py-3 text-center font-semibold tabular-nums">{item.quantity}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                                {formatMoney(item.unitPriceCents)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                                {formatMoney(item.unitPriceCents * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer QR + Totals */}
                    <div className="mt-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-zinc-200 p-1">
                          <DemoQrSvg value={buildQrPayload(invoice, emitter)} size={112} />
                        </div>
                        <div className="max-w-xs space-y-1 text-[11px] text-zinc-500">
                          <p className="inline-flex items-center gap-1.5 font-semibold text-zinc-700">
                            <ShieldCheck size={14} className="text-[#ed1450]" aria-hidden="true" />
                            Representación impresa DEMO
                          </p>
                          <p className="break-all font-mono text-[10px] text-zinc-400">
                            Resumen: {invoice.hashCode}
                          </p>
                          <p className="leading-4">{emitter.ticketFooter}</p>
                        </div>
                      </div>

                      <div className="w-full max-w-[260px] space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs">
                        <div className="flex justify-between text-zinc-600">
                          <span>Op. Gravada</span>
                          <span className="font-medium tabular-nums">{formatMoney(invoice.subtotalCents)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-600">
                          <span>IGV ({formatIgvPercent(invoice.igvRate ?? emitter.igvRate)})</span>
                          <span className="font-medium tabular-nums">{formatMoney(invoice.igvCents)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-300 pt-2 text-sm font-bold text-zinc-900">
                          <span>Importe Total</span>
                          <span className="tabular-nums text-[#ed1450]">{formatMoney(invoice.totalCents)}</span>
                        </div>
                      </div>
                    </div>

                    {invoice.voidReason && (
                      <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-[#cf1045]">
                        <span className="font-semibold">Motivo registrado:</span> {invoice.voidReason}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {invoice.status === "EMITIDO" && invoice.type !== "NOTA_CREDITO" && (
                  <button
                    type="button"
                    onClick={() => onRequestVoid(invoice)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-[#cf1045] transition-colors hover:bg-rose-100"
                  >
                    <Ban size={15} aria-hidden="true" />
                    Anular / Nota de crédito
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  {copied ? (
                    <>
                      <Check size={15} className="text-emerald-600" aria-hidden="true" />
                      Resumen copiado
                    </>
                  ) : (
                    <>
                      <Copy size={15} aria-hidden="true" />
                      Copiar detalle
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSimulatePrint}
                  disabled={printing}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ed1450] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d01046] disabled:opacity-60"
                >
                  <Printer size={15} aria-hidden="true" />
                  {printing ? "Imprimiendo..." : format === "ticket" ? "Imprimir ticket DEMO" : "Imprimir A4 DEMO"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
