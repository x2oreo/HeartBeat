import { getCurrentUser } from '@/lib/auth'
import { subscribe, unsubscribe } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = user.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        type: 'connected',
        data: null,
        timestamp: new Date().toISOString(),
      })}\n\n`
      controller.enqueue(encoder.encode(connectEvent))

      subscribe(userId, controller)
    },
    cancel(controller) {
      unsubscribe(userId, controller as ReadableStreamDefaultController<Uint8Array>)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
