"use client"

import { useCallback, useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AUTH_CHANGE_EVENT,
  clearStoredToken,
  getStoredToken,
} from "@/lib/api"

export function HeaderActions() {
  const [hasToken, setHasToken] = useState(false)

  const syncAuthState = useCallback(() => {
    setHasToken(Boolean(getStoredToken()))
  }, [])

  useEffect(() => {
    syncAuthState()

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState)
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState)
  }, [syncAuthState])

  return (
    <div className="flex items-center gap-2">
      {hasToken && (
        <Button variant="ghost" size="icon" aria-label="Cerrar sesion" onClick={clearStoredToken}>
          <LogOut className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
