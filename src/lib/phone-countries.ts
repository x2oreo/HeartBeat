// ── Country phone data & E.164 helpers ───────────────────────────────

export type CountryPhone = {
  code: string       // ISO 3166-1 alpha-2
  dialCode: string   // e.g. "+1"
  flag: string       // emoji
  name: string
  minDigits: number  // national number min length (excluding dial code)
  maxDigits: number  // national number max length
}

export const COUNTRIES: CountryPhone[] = [
  { code: 'US', dialCode: '+1',   flag: '🇺🇸', name: 'United States', minDigits: 10, maxDigits: 10 },
  { code: 'CA', dialCode: '+1',   flag: '🇨🇦', name: 'Canada',        minDigits: 10, maxDigits: 10 },
  { code: 'GB', dialCode: '+44',  flag: '🇬🇧', name: 'United Kingdom', minDigits: 10, maxDigits: 10 },
  { code: 'DE', dialCode: '+49',  flag: '🇩🇪', name: 'Germany',       minDigits: 6,  maxDigits: 11 },
  { code: 'FR', dialCode: '+33',  flag: '🇫🇷', name: 'France',        minDigits: 9,  maxDigits: 9 },
  { code: 'IT', dialCode: '+39',  flag: '🇮🇹', name: 'Italy',         minDigits: 9,  maxDigits: 11 },
  { code: 'ES', dialCode: '+34',  flag: '🇪🇸', name: 'Spain',         minDigits: 9,  maxDigits: 9 },
  { code: 'BG', dialCode: '+359', flag: '🇧🇬', name: 'Bulgaria',      minDigits: 8,  maxDigits: 9 },
  { code: 'PL', dialCode: '+48',  flag: '🇵🇱', name: 'Poland',        minDigits: 9,  maxDigits: 9 },
  { code: 'NL', dialCode: '+31',  flag: '🇳🇱', name: 'Netherlands',   minDigits: 9,  maxDigits: 9 },
  { code: 'AU', dialCode: '+61',  flag: '🇦🇺', name: 'Australia',     minDigits: 9,  maxDigits: 9 },
  { code: 'IN', dialCode: '+91',  flag: '🇮🇳', name: 'India',         minDigits: 10, maxDigits: 10 },
  { code: 'JP', dialCode: '+81',  flag: '🇯🇵', name: 'Japan',         minDigits: 10, maxDigits: 11 },
  { code: 'CN', dialCode: '+86',  flag: '🇨🇳', name: 'China',         minDigits: 11, maxDigits: 11 },
  { code: 'KR', dialCode: '+82',  flag: '🇰🇷', name: 'South Korea',   minDigits: 9,  maxDigits: 11 },
  { code: 'BR', dialCode: '+55',  flag: '🇧🇷', name: 'Brazil',        minDigits: 10, maxDigits: 11 },
  { code: 'MX', dialCode: '+52',  flag: '🇲🇽', name: 'Mexico',        minDigits: 10, maxDigits: 10 },
  { code: 'IL', dialCode: '+972', flag: '🇮🇱', name: 'Israel',        minDigits: 9,  maxDigits: 9 },
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'UAE',           minDigits: 9,  maxDigits: 9 },
  { code: 'ZA', dialCode: '+27',  flag: '🇿🇦', name: 'South Africa',  minDigits: 9,  maxDigits: 9 },
]

// Sorted by dial code length descending so longer codes match first (+359 before +3)
const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
)

const DEFAULT_COUNTRY = COUNTRIES[0] // US

/**
 * Parse an E.164 string into country + national number.
 * Falls back to default country if no match.
 */
export function parseE164(phone: string): {
  country: CountryPhone
  nationalNumber: string
} {
  if (!phone.startsWith('+')) {
    return { country: DEFAULT_COUNTRY, nationalNumber: phone.replace(/\D/g, '') }
  }

  for (const c of COUNTRIES_BY_DIAL_LENGTH) {
    if (phone.startsWith(c.dialCode)) {
      return {
        country: c,
        nationalNumber: phone.slice(c.dialCode.length),
      }
    }
  }

  return { country: DEFAULT_COUNTRY, nationalNumber: phone.replace(/\D/g, '') }
}

/** Combine dial code + national digits into E.164 string */
export function toE164(dialCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, '')
  return `${dialCode}${digits}`
}

/** Validate national number length for a country. Returns error string or undefined. */
export function validateNationalNumber(
  country: CountryPhone,
  nationalNumber: string,
): string | undefined {
  const digits = nationalNumber.replace(/\D/g, '')
  if (!digits) return 'Phone number is required'
  if (digits.length < country.minDigits) {
    return `Phone number is too short (need ${country.minDigits} digits for ${country.name})`
  }
  if (digits.length > country.maxDigits) {
    return `Phone number is too long (max ${country.maxDigits} digits for ${country.name})`
  }
  return undefined
}

/** Format an E.164 or legacy phone string for display */
export function formatPhoneDisplay(phone: string): string {
  if (!phone.startsWith('+')) return phone

  const { country, nationalNumber } = parseE164(phone)
  return `${country.dialCode} ${nationalNumber}`
}
