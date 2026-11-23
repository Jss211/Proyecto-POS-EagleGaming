import { motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"

export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#cf1045] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ad0d3a]"
export const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-40"
export const fieldClass = "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#cf1045] focus:outline-none focus:ring-1 focus:ring-[#cf1045]"

export default function ProductDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/60">
      <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 p-4 sm:px-6">
          <h3 id={titleId} className="font-gaming text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar diálogo" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-zinc-100">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </motion.div>
    </dialog>
  )
}
