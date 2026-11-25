import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Bell, ChevronDown, Menu, X, ExternalLink, LogOut } from "lucide-react"
import { COMPANY_LOGO_URL } from "@/lib/company"
import { navigationGroups, type ErpModule } from "@/routes/erp-navigation"
import { initialOpenGroups, sidebarStorageKey, toggleOpenGroup } from "./sidebar-state"

export interface ErpAccount {
  sessionIdentity: string
  email: string
  onSignOut: () => Promise<void>
}

function Sidebar({
  tradeName,
  selectedId,
  preview,
  openGroups,
  onToggleGroup,
  onNavigate,
  account,
  onSignOut,
  signingOut,
}: {
  tradeName: string
  selectedId: string
  preview: boolean
  openGroups: string[]
  onToggleGroup: (title: string) => void
  onNavigate?: () => void
  account?: ErpAccount
  onSignOut?: () => Promise<void>
  signingOut?: boolean
}) {
  const sidebarId = useId()
  return (
    <div className="flex min-h-full flex-col bg-[#141419] text-zinc-300">
      <a href="#/dashboard" onClick={onNavigate} className="flex items-center gap-3 border-b border-white/10 px-6 py-6" aria-label="EagleGaming, ir al dashboard">
        <img src={COMPANY_LOGO_URL} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1 shadow-sm" />
        <span>
          <span className="block font-gaming text-lg font-bold italic tracking-wide text-white">{tradeName}</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">POS / ERP</span>
        </span>
      </a>
      <nav aria-label="Módulos del ERP" className="flex-1 space-y-3 px-3 py-5">
        {navigationGroups.map(group => (
          <div key={group.title}>
            <button
              type="button"
              aria-expanded={openGroups.includes(group.title)}
              aria-controls={`${sidebarId}-${encodeURIComponent(group.title)}`}
              onClick={() => onToggleGroup(group.title)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              {group.title}
              <ChevronDown size={14} className={`transition-transform duration-200 ${openGroups.includes(group.title) ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div id={`${sidebarId}-${encodeURIComponent(group.title)}`} hidden={!openGroups.includes(group.title)} className="mt-1 space-y-1">
              {group.modules.map(({ id, title, icon: Icon }) => (
                <a
                  key={id}
                  href={`#/${id}`}
                  onClick={onNavigate}
                  aria-current={selectedId === id ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                    selectedId === id
                      ? "bg-[#ed1450] font-semibold text-white shadow-md shadow-rose-900/30"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {title}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Perfil y sesión al pie del sidebar */}
      <div className="mt-auto border-t border-white/10 p-3.5">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 border border-white/5">
          <div className="relative shrink-0">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ed1450]/20 border border-[#ed1450]/40 font-gaming text-sm font-bold text-rose-400 shadow-sm">
              EG
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white" title={account?.email ?? "Perfil de demostración"}>
              {account?.email ?? "Perfil de demostración"}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {account ? "Sesión iniciada" : "Modo demostración"}
            </p>
          </div>
          {account && (
            <button
              type="button"
              onClick={() => void onSignOut?.()}
              disabled={signingOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión de EagleGaming"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-wait disabled:opacity-50"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {preview && (
          <div className="mt-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <a href="/" className="inline-flex items-center gap-1.5 text-[11px] text-rose-300 hover:underline">
              Volver al inicio / login <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
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
    <aside className="sticky top-0 hidden h-screen overflow-y-auto lg:block">
      <Sidebar tradeName={tradeName} selectedId={selectedId} preview={!account} openGroups={openGroups} onToggleGroup={toggleGroup} account={account} onSignOut={signOut} signingOut={signingOut} />
    </aside>
    <dialog ref={menuRef} aria-label="Navegación EagleGaming" className="m-0 h-[100dvh] max-h-none w-[min(320px,90vw)] max-w-none border-0 bg-[#141419] p-0 text-zinc-300 backdrop:bg-black/60">
      <button type="button" onClick={() => menuRef.current?.close()} className="absolute right-2 top-1 rounded-md p-2 text-white" aria-label="Cerrar menú"><X size={20} /></button>
      <Sidebar tradeName={tradeName} selectedId={selectedId} preview={!account} openGroups={openGroups} onToggleGroup={toggleGroup} onNavigate={() => menuRef.current?.close()} account={account} onSignOut={signOut} signingOut={signingOut} />
    </dialog>
    <div className="min-w-0">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => menuRef.current?.showModal()} aria-label="Abrir menú de módulos" className="rounded-lg border border-zinc-200 p-2 lg:hidden"><Menu size={20} /></button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">EagleGaming / Espacio de trabajo</p>
              <h1 className="mt-0.5 text-lg font-bold text-zinc-900 truncate">{selectedModule?.title ?? "Módulo no encontrado"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button type="button" aria-label="Notificaciones" aria-expanded={notificationsOpen} aria-controls="preview-notifications" onClick={() => setNotificationsOpen(open => !open)} className="rounded-lg border border-zinc-200 p-2.5 text-zinc-500 hover:bg-zinc-50 transition-colors"><Bell size={18} /></button>
              {notificationsOpen && <div id="preview-notifications" className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"><h2 className="text-sm font-semibold">Notificaciones</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Panel de avisos operativos del sistema.</p><button type="button" onClick={() => setNotificationsOpen(false)} className="mt-3 text-xs font-semibold text-[#cf1045]">Cerrar</button></div>}
            </div>
          </div>
        </div>
      </header>
      <main id="erp-content" tabIndex={-1} className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-8">
        {signOutError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
        {children}
        <footer className="border-t border-zinc-200 pt-5 text-xs text-zinc-400">EagleGaming POS / ERP · Estructura en desarrollo</footer>
      </main>
    </div>
  </div>
}
