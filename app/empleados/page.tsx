import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EmployeesTable } from "@/components/empleados/employees-table"
export default async function EmpleadosPage() {
  return (
    <DashboardLayout
      title="Empleados"
      subtitle="Gestión del personal de la empresa"
    >
      <EmployeesTable />
    </DashboardLayout>
  )
}
