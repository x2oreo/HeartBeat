'use client'

import type { UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScanResultPart } from './parts/ScanResultPart'
import { MedicationListPart } from './parts/MedicationListPart'
import { EmergencyCardPart } from './parts/EmergencyCardPart'
import { DoctorPrepPart } from './parts/DoctorPrepPart'
import { ToolProgressPart } from './parts/ToolProgressPart'

export function ChatMessage({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    return <UserBubble message={message} />
  }

  return <AssistantBubble message={message} />
}

function UserBubble({ message }: { message: UIMessage }) {
  const textContent = message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('')

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-3">
        <p className="text-[15px] leading-relaxed text-white whitespace-pre-wrap">{textContent}</p>
      </div>
    </div>
  )
}

// Extract tool name from part type (e.g., "tool-scan_drug" -> "scan_drug")
function getToolName(partType: string): string | null {
  if (partType.startsWith('tool-')) {
    return partType.slice(5)
  }
  return null
}

function AssistantBubble({ message }: { message: UIMessage }) {
  const parts = message.parts

  return (
    <div className="flex gap-3">
      {/* Agent avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand mt-0.5">
        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <div className="min-w-0 max-w-[90%] space-y-3">
        {parts.map((part, i) => {
          if (part.type === 'text' && part.text.trim()) {
            return (
              <div key={i} className="rounded-2xl rounded-tl-md bg-surface-raised px-4 py-3 card-shadow">
                <div className="prose prose-sm max-w-none text-[15px] text-text-primary leading-relaxed
                  [&>p]:mb-2 [&>p:last-child]:mb-0
                  [&>h1]:text-base [&>h1]:font-semibold [&>h1]:mb-2 [&>h1]:mt-3 [&>h1:first-child]:mt-0
                  [&>h2]:text-[15px] [&>h2]:font-semibold [&>h2]:mb-2 [&>h2]:mt-3 [&>h2:first-child]:mt-0
                  [&>h3]:text-[14px] [&>h3]:font-semibold [&>h3]:mb-1.5 [&>h3]:mt-3 [&>h3:first-child]:mt-0
                  [&>ul]:mb-2 [&>ul]:pl-4 [&>ul>li]:mb-0.5 [&>ul>li]:list-disc
                  [&>ol]:mb-2 [&>ol]:pl-4 [&>ol>li]:mb-0.5 [&>ol>li]:list-decimal
                  [&>hr]:my-3 [&>hr]:border-text-tertiary/20
                  [&_strong]:font-semibold [&_em]:italic
                  [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px]
                  [&>table]:w-full [&>table]:border-collapse [&>table]:text-[13px] [&>table]:my-2
                  [&>table_th]:border [&>table_th]:border-separator [&>table_th]:bg-surface [&>table_th]:px-3 [&>table_th]:py-1.5 [&>table_th]:text-left [&>table_th]:font-semibold [&>table_th]:text-text-primary
                  [&>table_td]:border [&>table_td]:border-separator [&>table_td]:px-3 [&>table_td]:py-1.5 [&>table_td]:text-text-secondary
                  [&>table_tr:nth-child(even)_td]:bg-surface/50
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                </div>
              </div>
            )
          }

          // Handle tool parts — in AI SDK v6, tool parts have type "tool-{name}"
          const toolName = getToolName(part.type)
          if (toolName) {
            const toolPart = part as { state: string; input?: unknown; output?: unknown }

            // Show progress while tool is running or awaiting approval
            if (
              toolPart.state === 'input-streaming' ||
              toolPart.state === 'input-available' ||
              toolPart.state === 'approval-requested' ||
              toolPart.state === 'approval-responded'
            ) {
              return (
                <ToolProgressPart
                  key={i}
                  toolName={toolName}
                  args={(toolPart.input ?? {}) as Record<string, unknown>}
                />
              )
            }

            // Show result when done
            if (toolPart.state === 'output-available') {
              return (
                <ToolResultRenderer
                  key={i}
                  toolName={toolName}
                  result={toolPart.output}
                />
              )
            }

            // Error state
            if (toolPart.state === 'output-error') {
              return (
                <div key={i} className="rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] px-4 py-3">
                  <p className="text-sm text-[#C41E16]">Tool execution failed. Please try again.</p>
                </div>
              )
            }
          }

          return null
        })}
      </div>
    </div>
  )
}

function ToolResultRenderer({ toolName, result }: { toolName: string; result: unknown }) {
  switch (toolName) {
    case 'scan_drug':
      return <ScanResultPart result={result} />
    case 'generate_emergency_card':
      return <EmergencyCardPart result={result} />
    case 'generate_doctor_prep':
      return <DoctorPrepPart result={result} />
    case 'get_medications':
      return <MedicationListPart result={result} />
    case 'lookup_drug_info':
      // Drug info is usually explained in the text response
      return null
    default:
      return null
  }
}
