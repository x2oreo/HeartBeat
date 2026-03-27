import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HeartGuard',
    short_name: 'HeartGuard',
    description: 'AI-powered medication safety for Long QT Syndrome',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F2F7',
    theme_color: '#3478F6',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
