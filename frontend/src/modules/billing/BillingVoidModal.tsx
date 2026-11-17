import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Ban, X } from "lucide-react"
import { formatMoney, type DemoInvoice } from "./billing-model"

const VOID_REASONS = [
  "Error en datos del receptor (RUC/DNI)",
  "Devolución total de productos",
  "Cambio de producto por modelo superior",
  "Error de digitación en monto o método de pago",
]

interface BillingVoidModalProps {
  invoice: DemoInvoice | null
  onClose: () => void
  onConfirm: (invoiceId: string, reason: string) => void
}

export default function BillingVoidModal({
  invoice,
  onClose,
  onConfirm,
}: BillingVoidModalProps) {
  const [reason, setReason] = useState(VOID_REASONS[0])

  useEffect(() => {
    if (invoice) setReason(VOID_REASONS[0])
  }, [invoice])

  useEffect(() => {
    if (!invoice) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [invoice, onClose])

  return (
    <AnimatePresence>
      {invoice && (
        <motion.div
          key="billing-void-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-void-title"
          onClick={e => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#ed1450]">
                  <AlertTriangle size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="billing-void-title" className="font-gaming text-base font-bold text-zinc-900">
                    Anular {invoice.number}
                  </h3>
                  <p className="text-xs text-zinc-500">Se emitirá una Nota de Crédito DEMO vinculada.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancelar anulación"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Receptor</span>
                  <span className="font-semibold text-zinc-900">{invoice.customerName}</span>
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span className="text-zinc-500">Importe a revertir</span>
                  <span className="font-bold tabular-nums text-[#ed1450]">
                    {formatMoney(invoice.totalCents)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Motivo de anulación / Nota de crédito
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="mt-1.5 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-800 focus:border-[#ed1450] focus:outline-none"
                  >
                    {VOID_REASONS.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(invoice.id, reason)
                  onClose()
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#ed1450] px-4 text-xs font-semibold text-white hover:bg-[#d01046]"
              >
                <Ban size={14} aria-hidden="true" />
                Confirmar anulación
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
