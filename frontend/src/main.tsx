import { lazy, StrictMode, Suspense } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { entryRoute, resetPath } from "./lib/entry-route"
import "./index.css"

const DevelopmentPreview = import.meta.env.DEV
  ? lazy(() => import("./routes/DevelopmentPreview"))
  : null
const isDevelopmentPreview = /^\/dev-preview\/?$/.test(window.location.pathname)

if (entryRoute === "recovery" && window.location.pathname !== resetPath) {
  const url = new URL(window.location.href)
  url.pathname = resetPath
  window.history.replaceState(window.history.state, "", url)
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {entryRoute !== "recovery" && DevelopmentPreview && isDevelopmentPreview ? (
      <Suspense fallback={<p role="status" className="p-8 text-sm">Cargando vista previa de EagleGaming…</p>}>
        <DevelopmentPreview />
      </Suspense>
    ) : <App route={entryRoute} />}
  </StrictMode>
)
