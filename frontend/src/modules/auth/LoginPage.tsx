import type React from "react"
import AuthForm from "@/components/ui/auth-form"

interface LoginPageProps {
  companyName?: string
  logoUrl?: string
  videoBackgroundUrl?: string
  onLoginSuccess?: (data: { email: string; role?: string }) => void
}

export const LoginPage: React.FC<LoginPageProps> = ({
  companyName = "EAGLE GAMING",
  logoUrl,
  videoBackgroundUrl,
  onLoginSuccess,
}) => {
  const handleSignIn = (credentials: { email: string; password: string }) => {
    console.log("Iniciando sesión en Eagle Gaming con:", credentials.email)
    if (onLoginSuccess) {
      onLoginSuccess({ email: credentials.email })
    }
  }

  const handleGoogleSignIn = () => {
    console.log("Iniciando sesión con Google...")
    // Integración OAuth con Google
  }

  const handlePinSignIn = () => {
    const pin = prompt("Ingrese su PIN de Cajero / Terminal:")
    if (pin) {
      console.log("Validando PIN de terminal:", pin)
    }
  }

  const handleForgotPassword = () => {
    alert("Comuníquese con el supervisor de Eagle Gaming para restablecer su clave.")
  }

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
      {/* Video de fondo opcional */}
      {videoBackgroundUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-35 z-0 pointer-events-none"
        >
          <source src={videoBackgroundUrl} type="video/mp4" />
        </video>
      )}

      {/* Degradado ambiental */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/80 to-zinc-950 z-0 pointer-events-none" />

      {/* Componente del formulario */}
      <div className="relative z-10 w-full">
        <AuthForm
          companyName={companyName}
          logoUrl={logoUrl}
          onSignIn={handleSignIn}
          onGoogleSignIn={handleGoogleSignIn}
          onPinSignIn={handlePinSignIn}
          onForgotPassword={handleForgotPassword}
        />
      </div>
    </div>
  )
}

export default LoginPage
