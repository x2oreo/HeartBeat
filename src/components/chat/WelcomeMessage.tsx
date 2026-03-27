'use client'

const QUICK_ACTIONS = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    label: 'Scan a medication',
    prompt: 'Is ciprofloxacin safe for me?',
    description: 'Check any drug for QT risk',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    label: 'Emergency Card',
    prompt: 'Create my emergency card',
    description: 'Generate a card for ER staff',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Doctor Prep',
    prompt: 'I have a doctor appointment coming up',
    description: 'Prepare for a doctor visit',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
    label: 'Ask a question',
    prompt: 'What should I know about Long QT Syndrome?',
    description: 'Learn about LQTS safety',
  },
]

export function WelcomeMessage({ onQuickAction }: { onQuickAction: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-8 pb-4">
      {/* Agent avatar large */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-[0_4px_16px_rgba(52,120,246,0.2)]">
        <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <h2 className="mt-5 text-xl font-semibold text-text-primary">
        HeartGuard AI
      </h2>
      <p className="mt-2 max-w-sm text-center text-sm text-text-secondary leading-relaxed">
        Your medication safety expert for Long QT Syndrome. I can check drugs, analyze interactions, and help you prepare for doctor visits.
      </p>

      {/* Quick action grid */}
      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onQuickAction(action.prompt)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-separator-light bg-surface-raised p-4 text-left transition-all hover:border-brand hover:shadow-md card-shadow"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
              {action.icon}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">{action.label}</p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">{action.description}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 max-w-sm text-center text-[11px] text-text-tertiary">
        HeartGuard AI provides medication safety information only. Always consult your cardiologist before making medication changes.
      </p>
    </div>
  )
}
