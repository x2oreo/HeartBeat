import { randomBytes, createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

const TOKEN_TTL_DAYS = 90

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Generate a 6-digit pairing code for watch setup.
 * Code expires after 5 minutes. Invalidates any existing codes for the user.
 */
export async function generatePairingCode(userId: string): Promise<string> {
  // Invalidate existing codes for this user
  await prisma.pairingCode.updateMany({
    where: { userId, used: false },
    data: { used: true },
  })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await prisma.pairingCode.create({
    data: { userId, code, expiresAt },
  })

  return code
}

/**
 * Exchange a 6-digit pairing code for a long-lived API bearer token.
 * Uses a Prisma transaction to ensure atomicity (no orphaned state if any step fails).
 * Returns the raw token (to send to the watch) or null if the code is invalid/expired.
 */
export async function exchangePairingCode(
  code: string
): Promise<{ token: string; userId: string } | null> {
  const pairingCode = await prisma.pairingCode.findUnique({
    where: { code },
  })

  if (!pairingCode) return null
  if (pairingCode.used) return null
  if (pairingCode.expiresAt < new Date()) return null

  // Generate token before transaction (crypto is not async)
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = sha256(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Atomic transaction: mark code used + revoke old tokens + create new token + ensure device
  await prisma.$transaction(async (tx) => {
    await tx.pairingCode.update({
      where: { id: pairingCode.id },
      data: { used: true },
    })

    await tx.apiToken.deleteMany({
      where: { userId: pairingCode.userId, label: 'watch' },
    })

    await tx.apiToken.create({
      data: {
        userId: pairingCode.userId,
        tokenHash,
        label: 'watch',
        expiresAt,
      },
    })

    await tx.watchDevice.upsert({
      where: { userId: pairingCode.userId },
      update: { lastSeen: new Date() },
      create: {
        userId: pairingCode.userId,
        lastSeen: new Date(),
      },
    })
  })

  return { token: rawToken, userId: pairingCode.userId }
}

/**
 * Revoke all watch API tokens for a user (e.g., when watch is lost).
 */
export async function revokeWatchTokens(userId: string): Promise<void> {
  await prisma.apiToken.deleteMany({
    where: { userId, label: 'watch' },
  })
}

/**
 * Authenticate a watch request by Bearer token.
 * Returns the database User or null if the token is invalid/expired.
 */
export async function getWatchUser(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null

  const rawToken = header.slice(7)
  if (!rawToken) return null

  const tokenHash = sha256(rawToken)

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          supabaseId: true,
          email: true,
          firstName: true,
          lastName: true,
          genotype: true,
          onboarded: true,
        },
      },
    },
  })

  if (!apiToken) return null
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null

  // Update lastUsed (fire and forget, log errors)
  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
    .catch((err) => {
      console.error(`[Watch Auth] Failed to update lastUsed for token ${apiToken.id}:`, err)
    })

  return apiToken.user
}
