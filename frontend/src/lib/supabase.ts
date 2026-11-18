import { createClient, isAuthRetryableFetchError, type Session } from "@supabase/supabase-js"
import { entryRoute, readCallbackParams, resetPath } from "./entry-route"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ixniekgyypunwpsuotbl.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: entryRoute !== "recovery",
    autoRefreshToken: entryRoute !== "recovery",
  },
})

const recoveryStorageKey = "eaglegaming-recovery-pkce"
let pkceClient: typeof supabase | undefined

function getPkceClient() {
  if (pkceClient) return pkceClient
  const memory = new Map<string, string>()
  // Supabase stores its PKCE verifiers separately from the authenticated session.
  // The verifier must survive opening the email in another tab of the same browser.
  const isVerifier = (key: string) => key.startsWith(`${recoveryStorageKey}-`) && key.endsWith("-code-verifier")
  pkceClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      autoRefreshToken: false,
      storageKey: recoveryStorageKey,
      storage: {
        getItem: key => isVerifier(key) ? localStorage.getItem(key) : memory.get(key) ?? null,
        setItem: (key, value) => {
          if (isVerifier(key)) localStorage.setItem(key, value)
          else memory.set(key, value)
        },
        removeItem: key => {
          if (isVerifier(key)) localStorage.removeItem(key)
          else memory.delete(key)
        },
      },
    },
  })
  return pkceClient
}

async function exchangeRecoveryCode(code: string) {
  const client = getPkceClient()
  const observed: { session?: Session } = {}
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) observed.session = session
  })
  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error) throw error
    if (data.session && observed.session?.access_token === data.session.access_token) return client
    if (data.session) await client.auth.signOut({ scope: "local" })
    return null
  } finally {
    subscription.unsubscribe()
  }
}

async function acceptImplicitRecovery(callbackParams: URLSearchParams) {
  const expiresAt = callbackParams.get("expires_at")
  if (callbackParams.get("type") !== "recovery" || !callbackParams.has("access_token")) return null
  if (expiresAt && !(Number(expiresAt) * 1000 > Date.now())) return null

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      storageKey: "eaglegaming-recovery-implicit",
    },
  })
  const { error } = await client.auth.initialize()
  if (error) throw error
  const { data, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  return data.session ? client : null
}

type RecoveryValidation = { state: "ready"; client: typeof supabase } | { state: "invalid" | "connection-error" }
let recoveryValidation: Promise<RecoveryValidation> | undefined

async function resolveRecoveryLink(): Promise<RecoveryValidation> {
  try {
    const callbackParams = readCallbackParams()
    if (callbackParams.has("error") || callbackParams.has("error_code")) return { state: "invalid" }
    const code = callbackParams.get("code")
    const client = await (code ? exchangeRecoveryCode(code) : acceptImplicitRecovery(callbackParams))
    return client ? { state: "ready", client } : { state: "invalid" }
  } catch (error) {
    return { state: isAuthRetryableFetchError(error) ? "connection-error" : "invalid" }
  } finally {
    window.history.replaceState(window.history.state, "", resetPath)
  }
}

export async function validateRecoveryLink(): Promise<RecoveryValidation["state"]> {
  if (entryRoute !== "recovery") return "invalid"
  recoveryValidation ??= resolveRecoveryLink()
  return (await recoveryValidation).state
}

export async function updateRecoveredPassword(password: string) {
  const result = await recoveryValidation
  if (result?.state !== "ready") return "El enlace ya no es válido. Solicita uno nuevo."
  const recoveryClient = result.client
  const { error } = await recoveryClient.auth.updateUser({ password })
  if (error) {
    if (isAuthRetryableFetchError(error)) return "No se pudo conectar con Supabase. Comprueba tu conexión y vuelve a intentar guardar."
    switch (error.code) {
      case "same_password": return "Elige una contraseña distinta de la anterior."
      case "weak_password": return "La contraseña no cumple los requisitos de seguridad. Usa una clave más larga con letras, números y símbolos."
      case "session_not_found":
      case "session_expired":
      case "bad_jwt": return "La sesión de recuperación venció. Solicita un enlace nuevo."
      default:
        return error.name === "AuthSessionMissingError" || error.status === 401
          ? "La sesión de recuperación venció. Solicita un enlace nuevo."
          : "No se pudo guardar la contraseña. Inténtalo de nuevo o solicita otro enlace."
    }
  }

  // Sign out locally from recovery and from any previous login on this browser.
  await Promise.allSettled([
    recoveryClient.auth.signOut({ scope: "local" }),
    supabase.auth.signOut({ scope: "local" }),
  ])
  return null
}

/**
 * Iniciar sesión con Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })
  if (error) {
    console.error("Error al iniciar sesión con Google:", error.message)
    throw error
  }
  return data
}

/**
 * Iniciar sesión con Correo y Contraseña
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    console.error("Error al iniciar sesión:", error.message)
    throw error
  }
  return data
}

/**
 * Registro de nueva cuenta con Correo y Contraseña
 */
export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })
  if (error) {
    console.error("Error al registrar cuenta:", error.message)
    throw error
  }
  return data
}

/**
 * Enviar correo de restablecimiento de contraseña
 */
export async function sendPasswordReset(email: string) {
  const { error } = await getPkceClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${resetPath}`,
  })
  if (error) {
    throw error
  }
}
