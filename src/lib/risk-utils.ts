import type { RiskCategory, ComboRiskLevel, RiskSource } from '@/types'

export function riskColor(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return {
      bg: 'bg-[#FFEDEC]',
      border: 'border-[#FF3B30]/20',
      text: 'text-[#C41E16]',
      icon: 'text-[#FF3B30]',
      badge: 'bg-[#FFEDEC] text-[#C41E16]',
    }
  if (category === 'POSSIBLE_RISK' || category === 'CONDITIONAL_RISK')
    return {
      bg: 'bg-[#FFF5E0]',
      border: 'border-[#FF9F0A]/20',
      text: 'text-[#8A5600]',
      icon: 'text-[#FF9F0A]',
      badge: 'bg-[#FFF5E0] text-[#8A5600]',
    }
  return {
    bg: 'bg-[#EAFBF0]',
    border: 'border-[#34C759]/20',
    text: 'text-[#1B7A34]',
    icon: 'text-[#34C759]',
    badge: 'bg-[#EAFBF0] text-[#1B7A34]',
  }
}

export function riskHeadline(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return { icon: '\u2715', text: 'DANGER — This medication can prolong QT interval' }
  if (category === 'POSSIBLE_RISK')
    return { icon: '\u26A0', text: 'Possible QT risk — discuss with your cardiologist' }
  if (category === 'CONDITIONAL_RISK')
    return { icon: '\u26A0', text: 'Conditional QT risk — depends on dosage and conditions' }
  return { icon: '\u2713', text: 'This medication is not on the QT risk list' }
}

export function comboColor(level: ComboRiskLevel) {
  if (level === 'CRITICAL' || level === 'HIGH')
    return 'bg-[#FFEDEC] text-[#C41E16]'
  if (level === 'MEDIUM')
    return 'bg-[#FFF5E0] text-[#8A5600]'
  return 'bg-[#EAFBF0] text-[#1B7A34]'
}

export function sourceLabel(source: RiskSource): string {
  switch (source) {
    case 'CREDIBLEMEDS_VERIFIED': return 'Verified by CredibleMeds'
    case 'CREDIBLEMEDS_API': return 'CredibleMeds API'
    case 'MULTI_SOURCE': return 'Multi-Source Verified'
    case 'AI_ENRICHED': return 'AI + External Data'
    case 'BG_VERIFIED': return 'Bulgarian Drug List'
    case 'AI_ASSESSED': return 'AI Assessment Only'
  }
}

export function sourceBadgeStyle(source: RiskSource): string {
  switch (source) {
    case 'CREDIBLEMEDS_VERIFIED':
    case 'CREDIBLEMEDS_API':
    case 'MULTI_SOURCE':
      return 'bg-blue-100 text-blue-700'
    case 'AI_ENRICHED':
      return 'bg-purple-100 text-purple-700'
    case 'AI_ASSESSED':
      return 'bg-amber-100 text-amber-700'
    case 'BG_VERIFIED':
      return 'bg-green-100 text-green-700'
  }
}

export function riskDotColor(category: RiskCategory, isDTA: boolean): string {
  if (category === 'KNOWN_RISK' || isDTA) return 'bg-[#FF3B30]'
  if (category === 'POSSIBLE_RISK' || category === 'CONDITIONAL_RISK') return 'bg-[#FF9F0A]'
  return 'bg-[#34C759]'
}

export function riskLabel(category: RiskCategory): string {
  switch (category) {
    case 'KNOWN_RISK': return 'Known Risk'
    case 'POSSIBLE_RISK': return 'Possible Risk'
    case 'CONDITIONAL_RISK': return 'Conditional Risk'
    case 'NOT_LISTED': return 'Not Listed'
  }
}
