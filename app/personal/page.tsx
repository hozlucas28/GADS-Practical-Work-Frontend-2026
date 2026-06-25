import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EmployeesTable } from "@/components/empleados/employees-table"
export default async function PersonalPage() {
  return (
    <DashboardLayout
      title="Personal"
      subtitle="Gestión del personal de la empresa"
    >
      <EmployeesTable />
    </DashboardLayout>
  )
}
