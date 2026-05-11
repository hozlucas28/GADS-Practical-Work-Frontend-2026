import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ClockingsTable } from "@/components/fichadas/clockings-table"

export default function FichadasPage() {
  return (
    <DashboardLayout
      title="Fichadas"
      subtitle="Registro de entradas y salidas"
    >
      <ClockingsTable />
    </DashboardLayout>
  )
}
