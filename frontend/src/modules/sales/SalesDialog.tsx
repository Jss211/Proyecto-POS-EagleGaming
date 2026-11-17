import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

export default function SalesDialog({ open = true, title, onClose, children, footer }: { open?: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = ref.current
    dialog?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} className="sales-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-800 shadow-xl backdrop:bg-black/60">
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 p-4 sm:px-6"><div><span className="text-[10px] font-semibold uppercase tracking-wider text-[#cf1045]">EagleGaming · Solo demostración</span><h3 id={titleId} className="mt-1 text-lg font-bold">{title}</h3></div><button type="button" autoFocus onClick={onClose} aria-label={`Cerrar ${title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"><X size={20} aria-hidden="true" /></button></header>
    <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
    {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-100 bg-white p-4 sm:px-6">{footer}</footer>}
  </dialog>
}
