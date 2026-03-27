'use client'

const TOOL_LABELS: Record<string, { title: string; steps: string[] }> = {
  scan_drug: {
    title: 'Checking medication safety...',
    steps: [
      'Searching US drug safety database',
      'Checking similar drug names',
      'Searching Bulgarian drug database',
      'Analyzing drug interactions',
    ],
  },
  scan_photo: {
    title: 'Reading medication from photo...',
    steps: [
      'Detecting drug names in image',
      'Verifying detected medications',
      'Running safety analysis',
    ],
  },
  generate_emergency_card: {
    title: 'Creating your emergency card...',
    steps: [
      'Loading your medications and contacts',
      'Generating emergency protocols',
      'Formatting card for ER staff',
    ],
  },
  generate_doctor_prep: {
    title: 'Preparing doctor visit document...',
    steps: [
      'Loading your medication profile',
      'Analyzing specialty-specific risks',
      'Generating safety briefing',
    ],
  },
  get_medications: {
    title: 'Loading your medications...',
    steps: ['Retrieving current medication list'],
  },
  lookup_drug_info: {
    title: 'Looking up drug information...',
    steps: ['Searching medication database'],
  },
}

export function ToolProgressPart({ toolName, args }: {
  toolName: string
  args: Record<string, unknown>
}) {
  const config = TOOL_LABELS[toolName] ?? { title: 'Processing...', steps: ['Working...'] }

  // Show drug name if available
  const drugName = typeof args?.drugName === 'string' ? args.drugName : null
  const title = drugName
    ? `Checking ${drugName}...`
    : config.title

  return (
    <div className="rounded-2xl rounded-tl-md bg-surface-raised px-4 py-4 card-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
        <span className="text-[13px] font-semibold text-text-primary">{title}</span>
      </div>

      <div className="space-y-2">
        {config.steps.map((step, i) => (
          <div
            key={step}
            className="flex items-center gap-2.5 animate-step-reveal"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-text-secondary">{step}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-brand/20 via-brand/40 to-brand/20 animate-pulse" />
    </div>
  )
}
