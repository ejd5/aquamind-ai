import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { resolveWorkspaceEntryTarget } from '@/lib/auth-entry-target'

export const dynamic = 'force-dynamic'

export default async function AuthEntryPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  let userId = (session.user as { id?: string }).id

  if (!userId) {
    const user = await db.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    })
    userId = user?.id
  }

  if (!userId) {
    redirect('/')
  }

  redirect(await resolveWorkspaceEntryTarget(userId))
}
