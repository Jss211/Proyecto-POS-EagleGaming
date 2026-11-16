import AuthForm from "@/components/ui/auth-form"

export function App() {
  return (
    <div className="relative min-h-screen w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
      {/* 
        Espacio preparado para video de fondo:
        Cuando tengas tu archivo de video (ej. /videos/eagle-bg.mp4), puedes descomentar la siguiente etiqueta:
      */}
      {/* 
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-30 z-0 pointer-events-none"
      >
        <source src="/videos/eagle-bg.mp4" type="video/mp4" />
      </video> 
      */}

      {/* Degradado ambiental sutil para gaming (funciona excelente con o sin video) */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/80 to-zinc-950 z-0" />

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
    </div>
  )
}

export default App
