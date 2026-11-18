import { useRef, useState } from "react"
import { rasterizeTicket, sendEscPosRequest } from "./billing-escpos"

const actions = [
  ["connect", "Probar conexión TCP"],
  ["test", "Imprimir prueba DEMO"],
  ["print", "Imprimir ticket por ESC/POS"],
] as const

export default function BillingEscPosControls({ getTicket, disabled }: {
  getTicket: () => HTMLElement | null
  disabled: boolean
}) {
  const [token, setToken] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const running = useRef(false)

  const run = async (action: (typeof actions)[number][0]) => {
    if (disabled || running.current || !token.trim()) return
    running.current = true
    setPending(true)
    setMessage(action === "connect" ? "Probando conexión TCP..." : "Preparando el raster del ticket...")
    try {
      let raster
      if (action !== "connect") {
        const source = getTicket()
        if (!source) throw new Error("Abre la vista previa del ticket antes de imprimir.")
        raster = await rasterizeTicket(source, action === "test")
        if (!source.isConnected || getTicket() !== source) return
      }
      setMessage(await sendEscPosRequest(token.trim(), raster))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la operación ESC/POS.")
    } finally {
      running.current = false
      setPending(false)
    }
  }

  return (
    <details className="mx-auto mt-5 w-full max-w-xl rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
      <summary className="cursor-pointer font-semibold">Impresión directa ESC/POS</summary>
      <label className="mt-3 block font-medium">
        Clave mostrada por el servicio local
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={event => setToken(event.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1.5"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <button key={action} type="button" disabled={disabled || pending || !token.trim()}
            className="rounded-md border border-zinc-200 px-2 py-1.5 font-semibold disabled:opacity-50"
            onClick={() => void run(action)}
          >
            {label}
          </button>
        ))}
      </div>
      {message && <p role="status" className="mt-2">{message}</p>}
    </details>
  )
}
