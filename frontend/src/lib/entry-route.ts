export const resetPath = "/reset-password"

export function readCallbackParams(url = new URL(window.location.href)) {
  const params = new URLSearchParams(url.hash.slice(1))
  url.searchParams.forEach((value, key) => params.set(key, value))
  return params
}

const pathname = window.location.pathname.replace(/\/$/, "")
export const entryRoute = pathname === resetPath || readCallbackParams().get("type") === "recovery"
  ? "recovery"
  : pathname === "/erp" ? "erp" : "login"

export type EntryRoute = typeof entryRoute
