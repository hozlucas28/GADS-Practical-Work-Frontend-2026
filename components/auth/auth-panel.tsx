"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  login,
  type AuthUser,
} from "@/lib/api"

type AuthPanelProps = {
  onAuthChange?: () => void
}

type CredentialsState = {
  nombre_usuario: string
  contrasena: string
}

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const [credentials, setCredentials] = useState<CredentialsState>({
    nombre_usuario: "",
    contrasena: "",
  })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setHasToken(false)
      setUser(null)
      return
    }

    setHasToken(true)
    setIsLoading(true)
    fetchMe()
      .then((me) => {
        setUser(me)
        setError(null)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Error de sesion"
        setError(message)
        clearStoredToken()
        setHasToken(false)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!credentials.nombre_usuario.trim() || !credentials.contrasena.trim()) {
      setError("Completa usuario y contrasena.")
      return
    }

    try {
      setIsLoading(true)
      await login({
        nombre_usuario: credentials.nombre_usuario.trim(),
        contrasena: credentials.contrasena,
      })
      const me = await fetchMe()
      setUser(me)
      setHasToken(true)
      setCredentials({ nombre_usuario: "", contrasena: "" })
      onAuthChange?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesion"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    clearStoredToken()
    setUser(null)
    setHasToken(false)
    onAuthChange?.()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-card-foreground">Sesion</p>
          <p className="text-xs text-muted-foreground">
            {user
              ? `Conectado como ${user.nombre_usuario} (${user.rol})`
              : "Inicia sesion para acceder a la API"}
          </p>
        </div>
        {hasToken && (
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        )}
      </div>

      {!hasToken && (
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="auth-usuario" className="text-xs font-medium">
              Usuario
            </label>
            <Input
              id="auth-usuario"
              value={credentials.nombre_usuario}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  nombre_usuario: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="auth-contrasena" className="text-xs font-medium">
              Contrasena
            </label>
            <Input
              id="auth-contrasena"
              type="password"
              value={credentials.contrasena}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  contrasena: event.target.value,
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Conectando
                </span>
              ) : (
                "Ingresar"
              )}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
