import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/DashboardLayout'
import { HomePage } from '@/components/HomePage'

export default async function Page() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <DashboardLayout user={user}>
      <HomePage />
    </DashboardLayout>
  )
}
