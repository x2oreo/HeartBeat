import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardLayout } from '@/components/DashboardLayout'
import { headers } from 'next/headers'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const headerList = await headers()
  const pathname = headerList.get('x-next-pathname') ?? ''
  const isOnboarding = pathname.startsWith('/onboarding')

  if (!user.onboarded && !isOnboarding) {
    redirect('/onboarding')
  }

  if (user.onboarded && isOnboarding) {
    redirect('/')
  }

  // Onboarding gets no chrome — it's a standalone flow
  if (isOnboarding) {
    return <>{children}</>
  }

  return <DashboardLayout email={user.email}>{children}</DashboardLayout>
}
