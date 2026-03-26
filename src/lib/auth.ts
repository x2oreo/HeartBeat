import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export { getWatchUser } from '@/lib/watch-auth'

/**
 * Get the current authenticated user from Supabase session.
 * Returns the Supabase user or null if not authenticated.
 */
export async function getSupabaseUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get the HeartGuard database user for the current session.
 * Creates the DB user if it doesn't exist yet (first login).
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) return null

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: supabaseUser.id },
    update: {},
    create: {
      supabaseId: supabaseUser.id,
      email: supabaseUser.email ?? '',
      name: supabaseUser.user_metadata?.full_name ?? null,
    },
  })

  return dbUser
}
