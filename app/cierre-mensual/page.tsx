import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Calendar, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react"

const monthlyClosures = [
  { month: "Abril 2026", status: "in_progress", pendingAnomalies: 12, processedEmployees: 142, totalEmployees: 156 },
  { month: "Marzo 2026", status: "completed", pendingAnomalies: 0, processedEmployees: 154, totalEmployees: 154 },
  { month: "Febrero 2026", status: "completed", pendingAnomalies: 0, processedEmployees: 152, totalEmployees: 152 },
  { month: "Enero 2026", status: "completed", pendingAnomalies: 0, processedEmployees: 150, totalEmployees: 150 },
]

const statusConfig = {
  in_progress: { label: "En Proceso", icon: Clock, color: "bg-warning/10 text-warning-foreground" },
  completed: { label: "Completado", icon: CheckCircle2, color: "bg-success/10 text-success" },
  pending: { label: "Pendiente", icon: AlertCircle, color: "bg-muted text-muted-foreground" },
}

export default function CierreMensualPage() {
  return (
    <DashboardLayout
      title="Cierre Mensual"
      subtitle="Gestión de cierres de nómina"
    >
      {/* Current Month Card */}
      <div className="rounded-xl border-2 border-primary/30 bg-card p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Cierre Abril 2026</h2>
              <p className="text-sm text-muted-foreground">Período actual en proceso</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-card-foreground">91%</p>
              <p className="text-xs text-muted-foreground">Progreso</p>
            </div>
            <Button className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Cerrar Período
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Empleados Procesados</p>
            <p className="text-xl font-semibold text-card-foreground">142 / 156</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive">Anomalías Pendientes</p>
            <p className="text-xl font-semibold text-destructive">12</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-4">
            <p className="text-sm text-warning-foreground">Novedades por Aprobar</p>
            <p className="text-xl font-semibold text-warning-foreground">8</p>
          </div>
        </div>
      </div>

      {/* Historical Closures */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-card-foreground">Historial de Cierres</h3>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Historial
          </Button>
        </div>
        <div className="divide-y divide-border">
          {monthlyClosures.map((closure) => {
            const config = statusConfig[closure.status as keyof typeof statusConfig]
            const Icon = config.icon
            return (
              <div
                key={closure.month}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/20"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{closure.month}</p>
                    <p className="text-xs text-muted-foreground">
                      {closure.processedEmployees} empleados procesados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {closure.status === "completed" && (
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Download className="h-4 w-4" />
                      Descargar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
