import { useEffect, useState } from "react"
import { MotionConfig } from "framer-motion"
import AuthForm from "@/components/ui/auth-form"

export function App() {
  const [reducedMotion, setReducedMotion] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setReducedMotion(preference.matches)
    updatePreference()
    preference.addEventListener("change", updatePreference)
    return () => preference.removeEventListener("change", updatePreference)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
    <main className="login-screen fixed inset-0 isolate w-full overflow-x-hidden overflow-y-auto bg-zinc-950">
      {!reducedMotion && !videoFailed && <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onError={() => setVideoFailed(true)}
        className="fixed inset-0 -z-20 h-full w-full object-cover pointer-events-none"
      >
        <source src="/videos/download%20(2).mp4" type="video/mp4" onError={() => setVideoFailed(true)} />
      </video>}

      {/* Degradado ambiental sutil para gaming (funciona excelente con o sin video) */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none bg-zinc-950/60 bg-[radial-gradient(ellipse_at_center,_transparent,_rgba(9,9,11,0.65))]" />

      {/* Formulario de Login */}
      <div className="relative z-10 w-full">
        <AuthForm
          companyName="EAGLE GAMING"
          onSignIn={({ email }) => {
            alert(`Iniciando sesión en Eagle Gaming para: ${email}`)
          }}
          onRegister={({ name, email }) => {
            alert(`Registro exitoso para ${name} (${email})`)
          }}
          onForgotPassword={(email) => {
            alert(`Instrucciones de recuperación enviadas a: ${email}`)
          }}
          onGoogleSignIn={() => {
            alert("Autenticación con Google solicitada.")
          }}
          onPinSignIn={() => {
            const pin = prompt("Ingrese su PIN de Cajero/Terminal:")
            if (pin) alert(`PIN recibido: ${pin}`)
          }}
        />
      </div>
    </main>
    </MotionConfig>
  )
}

export default App
