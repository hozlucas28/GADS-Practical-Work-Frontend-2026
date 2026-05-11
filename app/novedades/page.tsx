import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { NovedadesTable } from "@/components/dashboard/novedades-table"

export default function NovedadesPage() {
  return (
    <DashboardLayout
      title="Novedades"
      subtitle="Gestión de eventos y anomalías laborales"
    >
      <NovedadesTable />
    </DashboardLayout>
  )
}
