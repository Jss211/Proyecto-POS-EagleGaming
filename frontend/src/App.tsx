import { lazy, Suspense, useEffect, useState } from "react"
import { MotionConfig } from "framer-motion"
import AuthForm from "@/components/ui/auth-form"
import {
  supabase,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  validateRecoveryLink,
  updateRecoveredPassword,
} from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { EntryRoute } from "@/lib/entry-route"

const ErpWorkspace = lazy(() => import("@/routes/ErpWorkspace"))

export function App({ route }: { route: EntryRoute }) {
  const isPasswordRecoveryPage = route === "recovery"
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [recoveryState, setRecoveryState] = useState<Awaited<ReturnType<typeof validateRecoveryLink>> | "checking">("checking")

  useEffect(() => {
    // 1. Detección de preferencia de movimiento reducido
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setReducedMotion(preference.matches)
    updatePreference()
    preference.addEventListener("change", updatePreference)

    if (isPasswordRecoveryPage) {
      let active = true
      void validateRecoveryLink().then(state => {
        if (active) setRecoveryState(state)
      })
      return () => {
        active = false
        preference.removeEventListener("change", updatePreference)
      }
    }

    // 2. Verificar sesión activa inicial en Supabase
    let active = true
    let authRevision = 0

    // 3. Escuchar cambios de autenticación en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      authRevision += 1
      setCurrentUser(session?.user ?? null)
      setSessionError(false)
      setLoading(false)
    })

    const initialRevision = authRevision
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active || authRevision !== initialRevision) return
      setCurrentUser(error ? null : session?.user ?? null)
      setSessionError(Boolean(error))
      setLoading(false)
    }).catch(() => {
      if (!active || authRevision !== initialRevision) return
      setCurrentUser(null)
      setSessionError(true)
      setLoading(false)
    })

    return () => {
      active = false
      preference.removeEventListener("change", updatePreference)
      subscription.unsubscribe()
    }
  }, [isPasswordRecoveryPage])

  const isErpRoute = route === "erp"
  const needsRedirect = !isPasswordRecoveryPage && !loading && (currentUser ? !isErpRoute : isErpRoute)

  useEffect(() => {
    if (!needsRedirect) return
    window.location.replace(currentUser ? "/erp#/dashboard" : "/")
  }, [currentUser, needsRedirect])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setCurrentUser(null)
  }

  if (!isPasswordRecoveryPage && (loading || needsRedirect)) {
    return (
      <div role="status" className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-gaming">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm uppercase tracking-wider">Cargando Eagle Gaming POS...</span>
        </div>
      </div>
    )
  }

  if (currentUser && isErpRoute) {
    return <Suspense fallback={<p role="status" className="p-8 text-sm">Cargando EagleGaming ERP…</p>}>
      <ErpWorkspace account={{ email: currentUser.email ?? "Correo no disponible", onSignOut: handleSignOut }} />
    </Suspense>
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="login-screen fixed inset-0 isolate w-full overflow-x-hidden overflow-y-auto bg-zinc-950 font-gaming">
        {/* Video de fondo oficial de Eagle Gaming */}
        {!reducedMotion && !videoFailed && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setVideoFailed(true)}
            className="fixed inset-0 -z-20 h-full w-full object-cover pointer-events-none opacity-50"
          >
            <source
              src="/videos/download%20(2).mp4"
              type="video/mp4"
              onError={() => setVideoFailed(true)}
            />
          </video>
        )}

        {/* Degradado ambiental oscuro para legibilidad sobre el video */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 pointer-events-none bg-zinc-950/70 bg-[radial-gradient(ellipse_at_center,_transparent,_rgba(9,9,11,0.85))]"
        />

        <div className="relative z-10 w-full min-h-screen flex items-center justify-center">
          {sessionError && <p role="alert" className="absolute top-4 mx-4 rounded-lg bg-white p-3 text-sm text-rose-700">No se pudo recuperar la sesión. Vuelve a iniciar sesión.</p>}
          <AuthForm
            companyName="EAGLE GAMING"
            onSignIn={async ({ email, password }) => {
              try {
                await signInWithEmail(email, password)
              } catch (err: any) {
                alert(`Error al iniciar sesión: ${err.message || "Credenciales incorrectas"}`)
              }
            }}
            onRegister={async ({ name, email, password }) => {
              try {
                await signUpWithEmail(email, password, name)
              } catch (err: any) {
                alert(`Error al registrar: ${err.message}`)
              }
            }}
            onForgotPassword={sendPasswordReset}
            recovery={isPasswordRecoveryPage ? { state: recoveryState, onUpdate: updateRecoveredPassword } : undefined}
            onGoogleSignIn={async () => {
              try {
                await signInWithGoogle()
              } catch (err: any) {
                alert(`Error con Google: ${err.message}`)
              }
            }}
          />
        </div>
      </main>
    </MotionConfig>
  )
}

export default App
