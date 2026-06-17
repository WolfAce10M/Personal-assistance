import { Header } from '@/components/layout/header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard"
        subtitle={today}
      />
      <div className="flex-1 p-4 md:p-6">
        <DashboardView />
      </div>
    </div>
  )
}
