import { lazy, StrictMode, Suspense } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

const DevelopmentPreview = import.meta.env.DEV
  ? lazy(() => import("./routes/DevelopmentPreview"))
  : null
const isDevelopmentPreview = /^\/dev-preview\/?$/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {DevelopmentPreview && isDevelopmentPreview ? (
      <Suspense fallback={<p role="status" className="p-8 text-sm">Cargando vista previa de EagleGaming…</p>}>
        <DevelopmentPreview />
      </Suspense>
    ) : <App />}
  </StrictMode>
)
