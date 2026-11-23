import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { secondaryButton } from "./ProductDialog"

type CheckState = { kind: "idle" | "checking" } | { kind: "result"; allowed: boolean } |
  { kind: "error"; message: string }

export default function ProductPermissionCheck({ email }: { email: string }) {
  const [state, setState] = useState<CheckState>({ kind: "idle" })
  const activeCheck = useRef<AbortController | null>(null)
  useEffect(() => () => activeCheck.current?.abort(), [])

  async function checkPermission() {
    if (activeCheck.current) return
    const controller = new AbortController()
    activeCheck.current = controller
    setState({ kind: "checking" })

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (controller.signal.aborted) return
      if (sessionError || !session || session.user.email !== email) {
        setState({ kind: "error", message: "No se pudo confirmar la sesión actual. Vuelve a iniciar sesión." })
        return
      }

      const { data, error, status } = await supabase
        .rpc("can_register_product", {}, { get: true })
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return

      if (error) {
        const code = error.code || (status ? String(status) : "")
        setState({
          kind: "error",
          message: `No se pudo consultar can_register_product()${code ? ` (${code})` : ""}.`,
        })
      } else if (typeof data !== "boolean") {
        setState({ kind: "error", message: "Supabase devolvió una respuesta distinta de true o false." })
      } else {
        setState({ kind: "result", allowed: data })
      }
    } catch {
      if (!controller.signal.aborted) {
        setState({ kind: "error", message: "No se pudo consultar el permiso. Revisa tu conexión e inténtalo de nuevo." })
      }
    } finally {
      if (activeCheck.current === controller) activeCheck.current = null
    }
  }

  return (
    <section aria-label="Comprobación de permiso de registro" className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Permiso de registro en Supabase</h3>
          <p className="mt-1 break-all text-sm text-zinc-600">{email}</p>
        </div>
        <button type="button" onClick={() => void checkPermission()} disabled={state.kind === "checking"} className={secondaryButton}>
          {state.kind === "checking" ? "Comprobando…" : "Comprobar permiso"}
        </button>
      </div>
      {state.kind === "result" && (
        <p role="status" className="mt-3 text-sm">Resultado de Supabase <code>{String(state.allowed)}</code></p>
      )}
      {state.kind === "error" && <p role="alert" className="mt-3 text-sm text-[#a71037]">{state.message}</p>}
    </section>
  )
}
