import type { Session } from "@supabase/supabase-js"

// The session claim stays stable when Supabase refreshes the access token.
export function sessionIdentity(session: Session) {
  try {
    const payload = session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const claim: unknown = JSON.parse(atob(payload)).session_id
    if (typeof claim === "string" && claim) return `${session.user.id}:${claim}`
  } catch {
    // Fall back to the authenticated user for tokens without a readable session claim.
  }
  return session.user.id
}
