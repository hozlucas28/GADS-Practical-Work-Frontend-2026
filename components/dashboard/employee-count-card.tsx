"use client"

import { useCallback, useEffect, useState } from "react"
import { Users } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { fetchEmployees } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export function EmployeeCountCard() {
  const [count, setCount] = useState<number | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  const loadEmployees = useCallback(() => {
    setStatus("loading")
    fetchEmployees()
      .then((data) => {
        setCount(data.length)
        setStatus("idle")
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Error al cargar"
        setStatus("error")
        toast({
          title: "Error al cargar empleados",
          description: message,
          variant: "destructive",
        })
      })
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  return (
    <KpiCard
      title="Total Empleados"
      value={count ?? "—"}
      change={
        status === "loading"
          ? "Cargando"
          : status === "error"
            ? "Sin acceso"
            : "Actualizado"
      }
      changeType={status === "error" ? "negative" : "positive"}
      icon={Users}
      iconColor="bg-primary/10 text-primary"
    />
  )
}
