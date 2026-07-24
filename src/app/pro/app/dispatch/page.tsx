import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProAccess } from '@/lib/pro/access'
import { DispatchLiveWorkspace } from '@/components/pro/dispatch-live-workspace'

export const dynamic = 'force-dynamic'

export default async function ProDispatchLivePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/pro/app/dispatch')
  const access = await getProAccess(session.user.id)
  if (!access.canManage) redirect('/pro/app/interventions')
  return <DispatchLiveWorkspace />
}
