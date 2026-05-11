import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UsersTable } from "@/components/usuarios/users-table"
export default async function UsuariosPage() {
  return (
    <DashboardLayout title="Usuarios" subtitle="Administracion de cuentas y roles">
      <UsersTable />
    </DashboardLayout>
  )
}
