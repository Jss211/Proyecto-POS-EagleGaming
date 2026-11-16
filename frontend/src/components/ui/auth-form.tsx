"use client"

import * as React from "react"
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, User, Mail, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export type AuthView = "login" | "register" | "forgot"

export interface AuthFormProps {
  /** Vista inicial (por defecto: 'login') */
  initialView?: AuthView
  /** Nombre o título de la empresa o sistema */
  companyName?: string
  /** URL de la imagen del águila (por defecto: /image.png) */
  logoUrl?: string
  /** Callbacks de autenticación */
  onSignIn?: (credentials: { email: string; password: string }) => void
  onRegister?: (data: { name: string; email: string; password: string }) => void
  onForgotPassword?: (email: string) => void
  onGoogleSignIn?: () => void
  onPinSignIn?: () => void
}

const AuthForm: React.FC<AuthFormProps> = ({
  initialView = "login",
  companyName = "EAGLE GAMING",
  logoUrl = "/image.png",
  onSignIn,
  onRegister,
  onForgotPassword,
  onGoogleSignIn,
  onPinSignIn,
}) => {
  const [view, setView] = React.useState<AuthView>(initialView)

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-gaming selection:bg-blue-600/30">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl"
      >
        <Logo companyName={companyName} logoUrl={logoUrl} />

        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 text-center">
                <h1 className="text-xl font-bold tracking-wide uppercase italic text-zinc-900 dark:text-zinc-100">
                  Iniciar Sesión
                </h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                  ¿No tienes una cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setView("register")}
                    className="font-bold text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                  >
                    Crear una aquí.
                  </button>
                </p>
              </div>

              <SocialButtons onGoogleSignIn={onGoogleSignIn} onPinSignIn={onPinSignIn} />
              <Divider />
              <LoginForm
                onSignIn={onSignIn}
                onForgotPasswordClick={() => setView("forgot")}
              />
            </motion.div>
          )}

          {view === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 text-center">
                <h1 className="text-xl font-bold tracking-wide uppercase italic text-zinc-900 dark:text-zinc-100">
                  Crear Cuenta Gaming
                </h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                  ¿Ya tienes una cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="font-bold text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                  >
                    Inicia sesión.
                  </button>
                </p>
              </div>

              <RegisterForm
                onRegister={onRegister}
                onBackToLogin={() => setView("login")}
              />
            </motion.div>
          )}

          {view === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 text-center">
                <h1 className="text-xl font-bold tracking-wide uppercase italic text-zinc-900 dark:text-zinc-100">
                  Recuperar Contraseña
                </h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                  Ingresa tu correo para recibir las instrucciones de restablecimiento.
                </p>
              </div>

              <ForgotPasswordForm
                onSubmitForgotPassword={onForgotPassword}
                onBackToLogin={() => setView("login")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   Logo & Branding
   ========================================================================== */
const Logo: React.FC<{ companyName: string; logoUrl?: string }> = ({
  companyName,
  logoUrl = "/image.png",
}) => {
  return (
    <div className="mb-6 flex flex-col items-center justify-center text-center">
      <img
        src={logoUrl}
        alt={companyName}
        className="h-20 w-20 object-contain drop-shadow-md mb-2.5"
      />
      <h2 className="text-2xl font-black italic tracking-wider text-zinc-900 dark:text-zinc-50 font-gaming uppercase">
        {companyName}
      </h2>
    </div>
  )
}

/* ==========================================================================
   Botón Primario Gaming
   ========================================================================== */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => (
  <button
    className={`rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-4 py-2.5 font-bold uppercase italic tracking-wider text-white shadow-lg shadow-blue-500/25 
    ring-2 ring-blue-500/40 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 
    transition-all hover:scale-[1.01] hover:shadow-blue-500/40 active:scale-[0.98] ${className || ""}`}
    {...props}
  >
    {children}
  </button>
)

/* ==========================================================================
   Botones Sociales (Google y PIN de Terminal)
   ========================================================================== */
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
)

const SocialButtons: React.FC<{
  onGoogleSignIn?: () => void
  onPinSignIn?: () => void
}> = ({ onGoogleSignIn, onPinSignIn }) => (
  <div className="space-y-2.5">
    <button
      type="button"
      onClick={onGoogleSignIn}
      className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 
      bg-zinc-50 dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 
      transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.99] shadow-sm font-sans"
    >
      <GoogleIcon />
      <span>Continuar con Google</span>
    </button>

    <button
      type="button"
      onClick={onPinSignIn}
      className="relative flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 
      bg-white dark:bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 
      transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-[0.99]"
    >
      <KeyRound size={15} className="text-blue-500" />
      <span>Acceso con PIN de Terminal / Cajero</span>
    </button>
  </div>
)

const Divider: React.FC = () => (
  <div className="my-5 flex items-center gap-3">
    <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />
    <span className="text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">O</span>
    <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />
  </div>
)

/* ==========================================================================
   Formulario 1: Iniciar Sesión (Login)
   ========================================================================== */
const LoginForm: React.FC<{
  onSignIn?: (credentials: { email: string; password: string }) => void
  onForgotPasswordClick: () => void
}> = ({ onSignIn, onForgotPasswordClick }) => {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSignIn) {
      onSignIn({ email, password })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <Mail size={13} className="text-blue-500" />
          Correo electrónico
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu.correo@eaglegaming.com"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
          bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-800 dark:text-zinc-200
          placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
          transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between">
          <label
            htmlFor="login-password"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
          >
            <Lock size={13} className="text-blue-500" />
            Contraseña
          </label>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400 font-sans"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••••••"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
            bg-white dark:bg-zinc-900/80 px-3.5 py-2 pr-10 text-sm text-zinc-800 dark:text-zinc-200
            placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
            transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
            aria-label={showPassword ? "Ocultar" : "Mostrar"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full mt-2">
        Iniciar Sesión
      </Button>
    </form>
  )
}

/* ==========================================================================
   Formulario 2: Crear Cuenta (Register)
   ========================================================================== */
const RegisterForm: React.FC<{
  onRegister?: (data: { name: string; email: string; password: string }) => void
  onBackToLogin: () => void
}> = ({ onRegister, onBackToLogin }) => {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (onRegister) {
      onRegister({ name, email, password })
    }
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="py-6 text-center space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 animate-bounce" />
        <h2 className="text-lg font-bold uppercase italic text-zinc-900 dark:text-zinc-100">
          ¡Cuenta creada con éxito!
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans max-w-xs mx-auto">
          Bienvenido a Eagle Gaming, <span className="font-bold text-blue-500">{name}</span>. Ya puedes iniciar sesión con tus credenciales.
        </p>
        <Button onClick={onBackToLogin} className="w-full">
          Ir al Inicio de Sesión
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs font-semibold text-red-500 text-center font-sans">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="register-name"
          className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <User size={13} className="text-blue-500" />
          Nombre completo o Gamertag
        </label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ej: JordanPro / Alex R."
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
          bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-800 dark:text-zinc-200
          placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
          transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <Mail size={13} className="text-blue-500" />
          Correo electrónico
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu.correo@eaglegaming.com"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
          bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-800 dark:text-zinc-200
          placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
          transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <Lock size={13} className="text-blue-500" />
          Contraseña
        </label>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
            bg-white dark:bg-zinc-900/80 px-3.5 py-2 pr-10 text-sm text-zinc-800 dark:text-zinc-200
            placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
            transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="register-confirm"
          className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <Lock size={13} className="text-blue-500" />
          Confirmar Contraseña
        </label>
        <input
          id="register-confirm"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Repite tu contraseña"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
          bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-800 dark:text-zinc-200
          placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
          transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <Button type="submit" className="w-full mt-2">
        Crear Cuenta
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 transition-colors"
      >
        <ArrowLeft size={14} /> Volver a Iniciar Sesión
      </button>
    </form>
  )
}

/* ==========================================================================
   Formulario 3: Recuperar Contraseña (Forgot Password)
   ========================================================================== */
const ForgotPasswordForm: React.FC<{
  onSubmitForgotPassword?: (email: string) => void
  onBackToLogin: () => void
}> = ({ onSubmitForgotPassword, onBackToLogin }) => {
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmitForgotPassword) {
      onSubmitForgotPassword(email)
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="py-6 text-center space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-blue-500 animate-pulse" />
        <h2 className="text-lg font-bold uppercase italic text-zinc-900 dark:text-zinc-100">
          ¡Enlace Enviado!
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans max-w-xs mx-auto">
          Hemos enviado un correo a <span className="font-bold text-blue-400">{email}</span> con las instrucciones para restablecer tu contraseña.
        </p>
        <Button onClick={onBackToLogin} className="w-full">
          Volver al Inicio de Sesión
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="forgot-email"
          className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <Mail size={13} className="text-blue-500" />
          Correo registrado
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu.correo@eaglegaming.com"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 
          bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-800 dark:text-zinc-200
          placeholder-zinc-400 dark:placeholder-zinc-500 font-sans
          transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <Button type="submit" className="w-full mt-2">
        Enviar Enlace de Recuperación
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 transition-colors"
      >
        <ArrowLeft size={14} /> Cancelar y Volver
      </button>
    </form>
  )
}

export default AuthForm
