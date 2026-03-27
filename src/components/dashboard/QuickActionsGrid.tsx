'use client'

import Link from 'next/link'

type QuickAction = {
  href: string
  label: string
  description: string
  icon: React.ReactNode
  style: 'hero' | 'coral' | 'blue' | 'teal'
}

const actions: QuickAction[] = [
  {
    href: '/scan',
    label: 'Scan Medication',
    description: 'Check QT risk instantly',
    style: 'hero',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'AI Assistant',
    description: 'Ask about safety',
    style: 'blue',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    href: '/emergency-card',
    label: 'Emergency Card',
    description: 'Share with doctors',
    style: 'coral',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: '/doctor-prep',
    label: 'Doctor Prep',
    description: 'Visit preparation',
    style: 'teal',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

const styleMap = {
  hero: {
    card: 'bg-gradient-to-br from-brand to-brand-deep text-white shadow-[0_4px_20px_rgba(52,120,246,0.35)]',
    icon: 'bg-white/20',
    desc: 'text-white/70',
  },
  blue: {
    card: 'bg-surface-raised card-shadow text-text-primary hover:shadow-md',
    icon: 'bg-brand-light text-brand',
    desc: 'text-text-tertiary',
  },
  coral: {
    card: 'bg-surface-raised card-shadow text-text-primary hover:shadow-md',
    icon: 'bg-coral-light text-coral',
    desc: 'text-text-tertiary',
  },
  teal: {
    card: 'bg-surface-raised card-shadow text-text-primary hover:shadow-md',
    icon: 'bg-teal-light text-teal',
    desc: 'text-text-tertiary',
  },
}

export function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, i) => {
        const s = styleMap[action.style]
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`group relative rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 animate-fade-in-up ${s.card}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.icon}`}>
              {action.icon}
            </div>
            <p className="font-semibold text-sm leading-tight">{action.label}</p>
            <p className={`text-xs mt-0.5 ${s.desc}`}>{action.description}</p>
          </Link>
        )
      })}
    </div>
  )
}
