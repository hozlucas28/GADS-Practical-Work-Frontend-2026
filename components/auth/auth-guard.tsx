"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import {
  AUTH_CHANGE_EVENT,
  clearStoredToken,
  fetchMe,
  getStoredToken,
} from "@/lib/api"

type AuthGuardProps = {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAllowed, setIsAllowed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const redirectToLogin = useCallback(() => {
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
    router.replace(`/login${next}`)
  }, [pathname, router])

  const checkSession = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setIsAllowed(false)
      setIsChecking(false)
      redirectToLogin()
      return
    }

    setIsChecking(true)
    fetchMe()
      .then(() => {
        setIsAllowed(true)
      })
      .catch(() => {
        setIsAllowed(false)
        clearStoredToken()
        redirectToLogin()
      })
      .finally(() => {
        setIsChecking(false)
      })
  }, [redirectToLogin])

  useEffect(() => {
    checkSession()

    window.addEventListener(AUTH_CHANGE_EVENT, checkSession)
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, checkSession)
  }, [checkSession])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <span className="inline-flex items-center gap-2 text-sm">
          <Spinner className="size-4" />
          Verificando sesion
        </span>
      </div>
    )
  }

  if (!isAllowed) return null

  return children
}
