import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AlertList } from "@/components/dashboard/alert-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthPanel } from "@/components/auth/auth-panel"
import { EmployeeCountCard } from "@/components/dashboard/employee-count-card"
import { fetchHealth } from "@/lib/api"

export default async function DashboardPage() {
  let error: string | null = null
  let apiStatus = "ok"

  try {
    const health = await fetchHealth()
    apiStatus = health.status
  } catch (err) {
    error = err instanceof Error ? err.message : "Error al consultar la API"
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Vista general del control laboral"
    >
      <AuthPanel />

      {error && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertTitle>Error de conexion</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EmployeeCountCard />
      </div>

      {/* Alert List */}
      <div className="mt-6">
        <AlertList />
      </div>
    </DashboardLayout>
  )
}
