import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ixniekgyypunwpsuotbl.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  })
  if (error) {
    console.error("Error al solicitar recuperación:", error.message)
    throw error
  }
  return data
}
