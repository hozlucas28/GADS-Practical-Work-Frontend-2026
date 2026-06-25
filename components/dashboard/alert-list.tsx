"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, UserX, ChevronRight } from "lucide-react"
import Link from "next/link"

type AlertType = "double_clock" | "missing_clock" | "late_arrival" | "overtime"

interface Alert {
  id: string
  type: AlertType
  employeeName: string
  date: string
  description: string
  severity: "high" | "medium" | "low"
}

const alertConfig: Record<
  AlertType,
  { icon: typeof AlertTriangle; label: string; color: string }
> = {
  double_clock: {
    icon: Clock,
    label: "Fichada Doble",
    color: "text-destructive bg-destructive/10",
  },
  missing_clock: {
    icon: UserX,
    label: "Fichada Faltante",
    color: "text-warning bg-warning/10",
  },
  late_arrival: {
    icon: Clock,
    label: "Llegada Tardía",
    color: "text-chart-3 bg-chart-3/10",
  },
  overtime: {
    icon: AlertTriangle,
    label: "Horas Extra",
    color: "text-chart-1 bg-chart-1/10",
  },
}

const sampleAlerts: Alert[] = [
  {
    id: "1",
    type: "double_clock",
    employeeName: "María García",
    date: "14 Abr 2026",
    description: "Dos fichadas de entrada registradas a las 08:00 y 08:05",
    severity: "high",
  },
  {
    id: "2",
    type: "missing_clock",
    employeeName: "Carlos Rodríguez",
    date: "14 Abr 2026",
    description: "Sin fichada de salida registrada",
    severity: "high",
  },
  {
    id: "3",
    type: "late_arrival",
    employeeName: "Ana Martínez",
    date: "13 Abr 2026",
    description: "Llegada 45 minutos después del horario",
    severity: "medium",
  },
  {
    id: "4",
    type: "missing_clock",
    employeeName: "Pedro López",
    date: "13 Abr 2026",
    description: "Sin fichada de entrada registrada",
    severity: "high",
  },
  {
    id: "5",
    type: "overtime",
    employeeName: "Laura Sánchez",
    date: "12 Abr 2026",
    description: "3.5 horas extra pendientes de aprobación",
    severity: "medium",
  },
]

export function AlertList() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Alertas Pendientes
          </h2>
          <p className="text-sm text-muted-foreground">
            Requieren atención inmediata
          </p>
        </div>
        <Link href="/novedades">
          <Button variant="outline" size="sm" className="gap-1.5">
            Ver todas
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="divide-y divide-border">
        {sampleAlerts.map((alert) => {
          const config = alertConfig[alert.type]
          const Icon = config.icon
          return (
            <div
              key={alert.id}
              className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
            >
              <div className={cn("rounded-lg p-2", config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-card-foreground">
                    {alert.employeeName}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      config.color
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground truncate">
                  {alert.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {alert.date}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
