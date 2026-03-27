export function getRiskStyle(risk: string): { bg: string; text: string; dot: string; border: string } {
  switch (risk) {
    case 'KNOWN_RISK':
      return { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', dot: '#FF3B30', border: 'border-[#FF3B30]/20' }
    case 'POSSIBLE_RISK':
      return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: '#FF9F0A', border: 'border-[#FF9F0A]/20' }
    case 'CONDITIONAL_RISK':
      return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: '#FF9F0A', border: 'border-[#FF9F0A]/20' }
    default:
      return { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', dot: '#34C759', border: 'border-[#34C759]/20' }
  }
}
