import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          id="contenido-principal"
          className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
        >
          <span className="inline-flex items-center gap-2 text-sm">
            <Spinner className="size-4" />
            Cargando
          </span>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
