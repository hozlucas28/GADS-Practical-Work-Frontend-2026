import { AuthGuard } from "@/components/auth/auth-guard"
import { Sidebar } from "./sidebar"
import { HeaderActions } from "./header-actions"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function DashboardLayout({
  children,
  title,
  subtitle,
}: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="pl-64">
          {/* Top header */}
          <header
            className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            aria-label="Encabezado"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <HeaderActions />
            </div>
          </header>

          {/* Main content */}
          <main id="contenido-principal" className="p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
