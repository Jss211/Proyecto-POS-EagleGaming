import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Bell, ChevronDown, Menu, Search, X, ExternalLink, LogOut } from "lucide-react"
import { COMPANY_LOGO_URL } from "@/lib/company"
import { navigationGroups, type ErpModule } from "@/routes/erp-navigation"
import { initialOpenGroups, sidebarStorageKey, toggleOpenGroup } from "./sidebar-state"

export interface ErpAccount {
  email: string
  onSignOut: () => Promise<void>
}

function Sidebar({ tradeName, selectedId, preview, openGroups, onToggleGroup, onNavigate }: { tradeName: string; selectedId: string; preview: boolean; openGroups: string[]; onToggleGroup: (title: string) => void; onNavigate?: () => void }) {
  const sidebarId = useId()
  return <div className="flex min-h-full flex-col bg-[#141419] text-zinc-300">
    <a href="#/dashboard" onClick={onNavigate} className="flex items-center gap-3 border-b border-white/10 px-6 py-6" aria-label="EagleGaming, ir al dashboard">
      <img src={COMPANY_LOGO_URL} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
      <span><span className="block font-gaming text-lg font-bold italic tracking-wide text-white">{tradeName}</span><span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">POS / ERP</span></span>
    </a>
    <nav aria-label="Módulos del ERP" className="flex-1 space-y-3 px-3 py-5">
      {navigationGroups.map(group => <div key={group.title}>
        <button type="button" aria-expanded={openGroups.includes(group.title)} aria-controls={`${sidebarId}-${encodeURIComponent(group.title)}`} onClick={() => onToggleGroup(group.title)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white">{group.title}<ChevronDown size={14} className={openGroups.includes(group.title) ? "rotate-180" : ""} aria-hidden="true" /></button>
        <div id={`${sidebarId}-${encodeURIComponent(group.title)}`} hidden={!openGroups.includes(group.title)} className="mt-1 space-y-1">{group.modules.map(({ id, title, icon: Icon }) => <a key={id} href={`#/${id}`} onClick={onNavigate} aria-current={selectedId === id ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${selectedId === id ? "bg-[#ed1450] font-semibold text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18} aria-hidden="true" />{title}</a>)}</div>
      </div>)}
    </nav>
    <div className="m-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-semibold text-zinc-200">{preview ? "Entorno de desarrollo" : "EagleGaming POS / ERP"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{preview ? "Vista previa sin autenticación ni conexión a servicios." : "Sesión autenticada. Los módulos siguen en desarrollo."}</p>{preview && <a href="/" className="mt-3 inline-flex items-center gap-2 text-xs text-rose-300 hover:underline">Volver al login <ExternalLink size={13} aria-hidden="true" /></a>}</div>
  </div>
}

export default function ErpLayout({ selectedModule, children, account, tradeName }: { tradeName: string; selectedModule?: ErpModule; children: ReactNode; account?: ErpAccount }) {
  const menuRef = useRef<HTMLDialogElement>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)
  const selectedId = selectedModule?.id ?? ""
  const [openGroups, setOpenGroups] = useState(() => initialOpenGroups(selectedId))

  useEffect(() => {
    try { localStorage.setItem(sidebarStorageKey, JSON.stringify(openGroups)) } catch { /* Keep in-memory preferences if storage is unavailable. */ }
  }, [openGroups])

  const toggleGroup = (title: string) => setOpenGroups(groups => toggleOpenGroup(groups, title))

  const signOut = async () => {
    if (!account || signingOut) return
    setSigningOut(true)
    setSignOutError(false)
    try {
      await account.onSignOut()
    } catch {
      setSignOutError(true)
    } finally {
      setSigningOut(false)
    }
  }

  useEffect(() => {
    setNotificationsOpen(false)
    const breakpoint = window.matchMedia("(min-width: 1024px)")
    const closeMenu = () => { if (breakpoint.matches) menuRef.current?.close() }
    breakpoint.addEventListener("change", closeMenu)
    return () => breakpoint.removeEventListener("change", closeMenu)
  }, [selectedId])

  return <div className="erp-preview min-h-screen bg-[#f6f6f9] text-zinc-800 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <button type="button" onClick={() => { const content = document.getElementById("erp-content"); content?.focus(); content?.scrollIntoView() }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Saltar al contenido</button>
    <aside className="sticky top-0 hidden h-screen overflow-y-auto lg:block"><Sidebar tradeName={tradeName} selectedId={selectedId} preview={!account} openGroups={openGroups} onToggleGroup={toggleGroup} /></aside>
    <dialog ref={menuRef} aria-label="Navegación EagleGaming" className="m-0 h-[100dvh] max-h-none w-[min(320px,90vw)] max-w-none border-0 bg-[#141419] p-0 text-zinc-300 backdrop:bg-black/60">
      <button type="button" onClick={() => menuRef.current?.close()} className="absolute right-2 top-1 rounded-md p-2 text-white" aria-label="Cerrar menú"><X size={20} /></button>
      <Sidebar tradeName={tradeName} selectedId={selectedId} preview={!account} openGroups={openGroups} onToggleGroup={toggleGroup} onNavigate={() => menuRef.current?.close()} />
    </dialog>
    <div className="min-w-0">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => menuRef.current?.showModal()} aria-label="Abrir menú de módulos" className="rounded-lg border border-zinc-200 p-2 lg:hidden"><Menu size={20} /></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">EagleGaming / Espacio de trabajo</p><h1 className="mt-1 text-lg font-bold text-zinc-900">{selectedModule?.title ?? "Módulo no encontrado"}</h1></div>
          <div className="hidden w-56 items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 xl:flex"><Search size={16} className="shrink-0 text-zinc-400" aria-hidden="true" /><input disabled aria-label="Buscar en EagleGaming, próximamente" placeholder="Buscar · Próximamente" className="w-full min-w-0 bg-transparent text-xs placeholder:text-zinc-400" /></div>
          <div className="relative">
            <button type="button" aria-label="Notificaciones de demostración" aria-expanded={notificationsOpen} aria-controls="preview-notifications" onClick={() => setNotificationsOpen(open => !open)} className="rounded-lg border border-zinc-200 p-2.5 text-zinc-500 hover:bg-zinc-50"><Bell size={18} /></button>
            {notificationsOpen && <div id="preview-notifications" className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg"><h2 className="text-sm font-semibold">Notificaciones · Demo</h2><p className="mt-2 text-xs leading-5 text-zinc-500">No hay notificaciones reales. Este panel contiene únicamente una demostración visual.</p><button type="button" onClick={() => setNotificationsOpen(false)} className="mt-3 text-xs font-semibold text-[#cf1045]">Cerrar</button></div>}
          </div>
          <div className="flex min-w-0 items-center gap-3 border-l border-zinc-200 pl-4"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 font-gaming text-sm font-bold text-[#ed1450]">EG</span><div className="min-w-0"><p className="max-w-[200px] break-words text-xs font-semibold">{account?.email ?? "Perfil de demostración"}</p><p className="mt-1 text-[11px] text-zinc-500">{account ? "Sesión autenticada" : "Sin sesión iniciada"}</p></div></div>
          {account && <button type="button" onClick={() => void signOut()} disabled={signingOut} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-[#cf1045] hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"><LogOut size={16} aria-hidden="true" />{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</button>}
        </div>
      </header>
      <main id="erp-content" tabIndex={-1} className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-8">
        {signOutError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
        {(!account || (selectedModule?.id !== "productos" && selectedModule?.id !== "inventario")) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-900"><span>{account ? <><strong>Datos de demostración.</strong> Tu sesión es real; las cifras y los productos del Dashboard son ejemplos.</> : <><strong>Vista previa de desarrollo.</strong> Datos de demostración; no representa una sesión autenticada.</>}</span>{!account && <a href="/" className="font-semibold underline underline-offset-4">Ir al login</a>}</div>
        )}
        {children}
        <footer className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">EagleGaming POS / ERP · Estructura en desarrollo</footer>
      </main>
    </div>
  </div>
}
