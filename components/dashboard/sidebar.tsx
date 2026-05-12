"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AUTH_CHANGE_EVENT,
  clearStoredToken,
  fetchMe,
  getStoredToken,
  type AuthUser,
} from "@/lib/api"
import {
  Users,
  Calendar,
  Clock,
  FileText,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/empleados", label: "Empleados", icon: Users },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/horarios", label: "Horarios", icon: Calendar },
  { href: "/fichadas", label: "Fichadas", icon: Clock },
  { href: "/novedades", label: "Novedades", icon: FileText },
  { href: "/cierre-mensual", label: "Cierre Mensual", icon: CalendarCheck },
]

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const loadUser = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsCheckingAuth(false)
      return
    }

    setIsCheckingAuth(true)
    fetchMe()
      .then((me) => {
        setUser(me)
      })
      .catch(() => {
        setUser(null)
        clearStoredToken()
      })
      .finally(() => {
        setIsCheckingAuth(false)
      })
  }, [])

  useEffect(() => {
    loadUser()

    window.addEventListener(AUTH_CHANGE_EVENT, loadUser)
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, loadUser)
  }, [loadUser])

  const initials = user?.nombre_usuario.slice(0, 2).toUpperCase() ?? "--"

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border"
      aria-label="Barra lateral"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Clock className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-sidebar-foreground">
              TimeTrack
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Control Laboral</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4" aria-label="Navegacion principal">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {isCheckingAuth
                  ? "Verificando..."
                  : user?.nombre_usuario ?? "Sin sesion"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email ?? "Sesion requerida"}
              </p>
            </div>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                aria-label="Cerrar sesion"
                onClick={clearStoredToken}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
