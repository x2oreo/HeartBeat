import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getWatchDashboardData } from '@/services/watch-health'
import { WatchPageContent } from '@/components/watch/WatchPageContent'

export default async function WatchPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const watchDevice = await prisma.watchDevice.findFirst({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!watchDevice) {
    return <WatchPageContent paired={false} initialData={null} />
  }

  const initialData = await getWatchDashboardData(user.id)

  return <WatchPageContent paired={true} initialData={initialData} />
}
