'use client'

import { Building2, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { CompanyCard } from '@/components/company/company-card'
import { CreateCompanyDialog } from '@/components/company/create-company-dialog'
import { useCompanies } from '@/hooks/use-company'
import type { Company } from '@/types/company'

export default function CompanyPage() {
  const { companies, loading, error, createCompany, deleteCompany } = useCompanies()

  const handleDelete = (company: Company) => {
    if (confirm(`¿Eliminar "${company.name}" con todo su equipo y misiones? No se puede deshacer.`)) {
      deleteCompany(company.id)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Empresa IA"
        subtitle="Tus equipos de agentes trabajando por ti"
        actions={<CreateCompanyDialog onCreate={createCompany} />}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        )}

        {error && <p className="py-4 text-center text-sm text-red-400">{error}</p>}

        {!loading && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20">
              <Building2 className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Crea tu primera empresa IA</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
              Cada empresa tiene a Jarvis como director, un auditor de calidad y los especialistas
              que necesites: ventas, marketing, trading, legal… Dale un objetivo y trabajan solos.
            </p>
            <div className="mt-5">
              <CreateCompanyDialog onCreate={createCompany} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {companies.map(company => (
            <CompanyCard key={company.id} company={company} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  )
}
