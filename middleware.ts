import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Sliding Window Rate Limiter ──────────────────────────────────────
// Hand-built rate limiter for scan endpoints. In production, use Redis.
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10
const rateLimitStore = new Map<string, number[]>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitStore.get(identifier) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestInWindow = timestamps[0]
    const retryAfterMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now
    rateLimitStore.set(identifier, timestamps)
    return { allowed: false, retryAfterMs }
  }

  timestamps.push(now)
  rateLimitStore.set(identifier, timestamps)
  return { allowed: true, retryAfterMs: 0 }
}

// Periodic cleanup to prevent memory leaks (every 100 requests)
let cleanupCounter = 0
function maybeCleanup() {
  cleanupCounter++
  if (cleanupCounter % 100 !== 0) return
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => t > cutoff)
    if (valid.length === 0) rateLimitStore.delete(key)
    else rateLimitStore.set(key, valid)
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limit scan endpoints ──────────────────────────────────────
  if (pathname.startsWith('/api/scan/')) {
    maybeCleanup()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed, retryAfterMs } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before scanning again.', retryAfterMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }
  }

  // Streaming routes: skip middleware response wrapping (it buffers the stream)
  // Auth is handled inside the route handler itself via getCurrentUser()
  if (pathname.startsWith('/api/scan/text/stream') || pathname.startsWith('/api/scan/photo/stream')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  // Watch API routes that use bearer token auth (not Supabase cookies).
  // /api/watch/stream and /api/watch/pair use Supabase session auth.
  const watchBearerPaths = [
    '/api/watch/health-data',
    '/api/watch/alert',
    '/api/watch/register-device',
    '/api/watch/config',
    '/api/watch/auth/token',
    '/api/watch/pair/init',
    '/api/watch/pair/poll',
    '/api/watch/unpair',
  ]
  if (watchBearerPaths.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  const isPublicPath =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/emergency-card/')

  if (!user && !isPublicPath) {
    // API routes: return 401 JSON instead of redirecting to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Pass pathname to server components via header (used by protected layout)
  supabaseResponse.headers.set('x-next-pathname', pathname)

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
