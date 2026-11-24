import { lazy, Suspense, useEffect, useState } from "react"
import { Construction } from "lucide-react"
import ErpLayout, { type ErpAccount } from "@/components/layout/ErpLayout"
import DashboardPage from "@/modules/dashboard/DashboardPage"
import RealSalesPage from "@/modules/sales/RealSalesPage"
import BillingPage from "@/modules/billing/BillingPage"
import ProductsPage from "@/modules/products/ProductsPage"
import InventoryPage from "@/modules/inventory/InventoryPage"
import { loadBillingStore } from "@/modules/billing/billing-demo"
import { erpModules } from "./erp-navigation"

const DemoSalesPage = import.meta.env.DEV ? lazy(() => import("@/modules/sales/SalesPage")) : null

function currentModuleId() {
  return window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "") || "dashboard"
}

export default function ErpWorkspace({ account }: { account?: ErpAccount }) {
  const [moduleId, setModuleId] = useState(currentModuleId)
  const [company, setCompany] = useState(() => loadBillingStore().emitter)
  const selectedModule = erpModules.find(module => module.id === moduleId)

  useEffect(() => {
    const navigate = () => {
      setModuleId(currentModuleId())
      document.getElementById("erp-content")?.focus()
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", navigate)
    return () => window.removeEventListener("hashchange", navigate)
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${selectedModule?.title ?? "Módulo no encontrado"} · ${account ? "EagleGaming" : "Vista previa EagleGaming"}`
    return () => { document.title = previousTitle }
  }, [selectedModule, account])

  return <ErpLayout selectedModule={selectedModule} account={account} tradeName={company.tradeName}>
    {moduleId === "dashboard" ? (
      <DashboardPage />
    ) : moduleId === "ventas" ? (
      DemoSalesPage && !account ? <Suspense fallback={<p role="status">Cargando vista de desarrollo…</p>}><DemoSalesPage company={company} /></Suspense> : <RealSalesPage key={account?.sessionIdentity} accountEmail={account?.email} sessionIdentity={account?.sessionIdentity} />
    ) : moduleId === "productos" ? (
      <ProductsPage key={account?.email} accountEmail={account?.email} demo={import.meta.env.DEV && !account} />
    ) : moduleId === "inventario" ? (
      <InventoryPage key={account?.email} accountEmail={account?.email} />
    ) : moduleId === "facturacion" ? (
      <BillingPage onEmitterChange={setCompany} />
    ) : (
      <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <span className="rounded-2xl bg-rose-50 p-4 text-[#ed1450]"><Construction size={32} aria-hidden="true" /></span>
        <span className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#cf1045]">{selectedModule ? "Próximamente" : "Ruta no disponible"}</span>
        <h2 className="mt-3 font-gaming text-2xl font-bold">{selectedModule?.title ?? "Módulo no encontrado"}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{selectedModule?.description ?? "La dirección no corresponde a un módulo de esta vista previa."}</p>
        {selectedModule && <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">La navegación está preparada. Su funcionalidad se implementará en un próximo sprint autorizado.</p>}
        <a href="#/dashboard" className="mt-6 rounded-lg bg-[#ed1450] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d01046]">Volver al Dashboard</a>
      </section>
    )}
  </ErpLayout>
}
