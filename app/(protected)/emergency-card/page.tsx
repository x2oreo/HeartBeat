import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/DashboardLayout'
import { EmergencyCardClient } from './client'

// TODO: Remove DashboardLayout wrapper when (protected)/layout.tsx is created by Person D
export default async function EmergencyCardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <DashboardLayout user={user}>
      <EmergencyCardClient />
    </DashboardLayout>
  )
}
