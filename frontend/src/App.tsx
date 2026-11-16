import { useEffect, useState } from "react"
import { MotionConfig } from "framer-motion"
import AuthForm from "@/components/ui/auth-form"
import {
  supabase,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { LogOut, User as UserIcon, ShieldCheck } from "lucide-react"

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    // 1. Detección de preferencia de movimiento reducido
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setReducedMotion(preference.matches)
    updatePreference()
    preference.addEventListener("change", updatePreference)

    // 2. Verificar sesión activa inicial en Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
      setLoading(false)
    })

    // 3. Escuchar cambios de autenticación en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      preference.removeEventListener("change", updatePreference)
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-gaming">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm uppercase tracking-wider">Cargando Eagle Gaming POS...</span>
        </div>
      </div>
    )
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

        {/* Vista cuando el usuario YA está autenticado */}
        {currentUser ? (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-6 text-zinc-100">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
              <div className="flex justify-center">
                {currentUser.user_metadata?.avatar_url ? (
                  <img
                    src={currentUser.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full border-2 border-blue-500 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center">
                    <UserIcon size={36} className="text-blue-400" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 font-tech">
                  <ShieldCheck size={16} /> Sesión Autenticada
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-wide">
                  ¡Bienvenido, {currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0]}!
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-sans">{currentUser.email}</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left text-xs font-sans space-y-1">
                <p className="text-zinc-500 uppercase tracking-wider font-gaming font-semibold">
                  Datos de la sesión:
                </p>
                <p className="text-zinc-300">
                  <span className="font-semibold text-blue-400">Proveedor:</span>{" "}
                  {currentUser.app_metadata?.provider?.toUpperCase() || "CORREO"}
                </p>
                <p className="text-zinc-300">
                  <span className="font-semibold text-blue-400">ID Usuario:</span> {currentUser.id}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 py-2.5 font-bold uppercase italic text-sm transition-all active:scale-[0.98]"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Login / Registro / Recuperación */
          <div className="relative z-10 w-full min-h-screen flex items-center justify-center">
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
              onForgotPassword={async (email) => {
                try {
                  await sendPasswordReset(email)
                } catch (err: any) {
                  alert(`Error: ${err.message}`)
                }
              }}
              onGoogleSignIn={async () => {
                try {
                  await signInWithGoogle()
                } catch (err: any) {
                  alert(`Error con Google: ${err.message}`)
                }
              }}
              onPinSignIn={() => {
                const pin = prompt("Ingrese su PIN de Cajero/Terminal:")
                if (pin) alert(`PIN recibido para terminal POS: ${pin}`)
              }}
            />
          </div>
        )}
      </main>
    </MotionConfig>
  )
}

export default App
