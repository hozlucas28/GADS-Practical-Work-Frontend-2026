"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Clock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { clearStoredToken, fetchMe, getStoredToken, login } from "@/lib/api"

type CredentialsState = {
  nombre_usuario: string
  contrasena: string
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [credentials, setCredentials] = useState<CredentialsState>({
    nombre_usuario: "",
    contrasena: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rawNextPath = searchParams.get("next")
  const nextPath =
    rawNextPath?.startsWith("/") && !rawNextPath.startsWith("//")
      ? rawNextPath
      : "/"

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    setIsLoading(true)
    fetchMe()
      .then(() => {
        router.replace(nextPath)
      })
      .catch(() => {
        clearStoredToken()
        setIsLoading(false)
      })
  }, [nextPath, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const nombre_usuario = credentials.nombre_usuario.trim()
    if (!nombre_usuario || !credentials.contrasena) {
      setError("Completa usuario y contrasena.")
      return
    }

    try {
      setIsLoading(true)
      await login({ nombre_usuario, contrasena: credentials.contrasena })
      router.replace(nextPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesion"
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <main
      id="contenido-principal"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
    >
      <section className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">TimeTrack</h1>
            <p className="text-sm text-muted-foreground">Control laboral</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-card-foreground">
              Iniciar sesion
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa con tu usuario para acceder al panel.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label htmlFor="login-usuario" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="login-usuario"
                autoComplete="username"
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
              <label htmlFor="login-contrasena" className="text-sm font-medium">
                Contrasena
              </label>
              <Input
                id="login-contrasena"
                type="password"
                autoComplete="current-password"
                value={credentials.contrasena}
                onChange={(event) =>
                  setCredentials((prev) => ({
                    ...prev,
                    contrasena: event.target.value,
                  }))
                }
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo ingresar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Ingresando
                </span>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
