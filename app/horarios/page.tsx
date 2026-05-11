import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { SchedulesGrid } from "@/components/horarios/schedules-grid"

export default function HorariosPage() {
  return (
    <DashboardLayout
      title="Horarios"
      subtitle="Configuración de turnos y horarios"
    >
      <SchedulesGrid />
    </DashboardLayout>
  )
}
