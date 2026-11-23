import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { secondaryButton } from "./ProductDialog"

type Permission = { kind: "checking" | "denied" } | { kind: "allowed"; userId: string } |
  { kind: "error"; message: string }

const permissionRpc = {
  registro: "can_register_product",
  edición: "can_update_product",
  "cambio de estado": "can_set_product_active",
  "entrada de inventario": "can_record_inventory_entry",
} as const

export function useProductPermission(email?: string, operation: keyof typeof permissionRpc = "registro") {
  const [permission, setPermission] = useState<Permission>({ kind: email ? "checking" : "denied" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!email) return
    let request: AbortController | undefined
    // Defer the RPC until the auth callback releases its session lock.
    let timer: ReturnType<typeof setTimeout> | undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      request?.abort()
      clearTimeout(timer)
      if (!session || (session.user.email ?? "Correo no disponible") !== email) {
        setPermission({ kind: "denied" })
        return
      }

      setPermission({ kind: "checking" })
      const controller = new AbortController()
      request = controller
      timer = setTimeout(async () => {
        try {
          const { data, error, status } = await supabase
            .rpc(permissionRpc[operation], {}, { get: true })
            .setHeader("Authorization", `Bearer ${session.access_token}`)
            .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
          if (controller.signal.aborted) return
          if (operation !== "registro" && error?.code === "PGRST202") {
            setPermission({ kind: "denied" })
            return
          }
          if (error || typeof data !== "boolean") {
            const code = error?.code || (status && error ? String(status) : "")
            setPermission({ kind: "error", message: `No se pudo comprobar el permiso de ${operation}${code ? ` (${code})` : ""}.` })
            return
          }
          setPermission(data ? { kind: "allowed", userId: session.user.id } : { kind: "denied" })
        } catch {
          if (!controller.signal.aborted) setPermission({ kind: "error", message: `No se pudo comprobar el permiso de ${operation}. Revisa tu conexión.` })
        }
      }, 0)
    })

    return () => {
      subscription.unsubscribe()
      request?.abort()
      clearTimeout(timer)
    }
  }, [email, attempt, operation])

  return { permission, retry: () => {
    setPermission({ kind: "checking" })
    setAttempt(value => value + 1)
  } }
}

export default function ProductPermissionCheck({ permission, onRetry }: { permission: Permission; onRetry: () => void }) {
  if (permission.kind === "error") {
    return <div className="flex flex-wrap items-center gap-3">
      <p role="alert" className="text-sm text-[#a71037]">{permission.message}</p>
      <button type="button" onClick={onRetry} className={secondaryButton}>Reintentar permiso</button>
    </div>
  }
  if (permission.kind === "checking") return <p role="status" className="text-sm text-zinc-600">Comprobando permiso de registro…</p>
  if (permission.kind === "denied") return <p className="text-sm text-zinc-600">Tu sesión no tiene permiso para registrar productos reales.</p>
  return null
}
