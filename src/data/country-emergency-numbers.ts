// Country emergency services lookup — ISO 3166-1 alpha-2 → emergency numbers
// Sources: national telecom regulators, EU 112 initiative, WHO emergency directory.
//
// Two numbers per country, both matter:
//   ambulance — the dedicated medical/cardiac line; what to call for an LQTS event
//   general   — the catch-all single emergency number (may equal ambulance)
//
// When they differ (FR, IT, PL, IN, AE…) the SMS/email shows both so the responder
// can choose. The voice call only reads `ambulance` to stay concise.

export type CountryEmergencyInfo = {
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string
  /** Human-readable country name */
  countryName: string
  /** Dedicated ambulance / medical line — the number to call for a cardiac emergency */
  ambulance: string
  /** Catch-all general emergency number; may equal ambulance */
  general: string
}

/**
 * Emergency numbers for every country in phone-countries.ts.
 * Keyed by uppercase ISO 3166-1 alpha-2 code.
 */
const COUNTRY_EMERGENCY_MAP: Record<string, CountryEmergencyInfo> = {
  US: { countryCode: 'US', countryName: 'United States',  ambulance: '911',   general: '911'   },
  CA: { countryCode: 'CA', countryName: 'Canada',         ambulance: '911',   general: '911'   },
  MX: { countryCode: 'MX', countryName: 'Mexico',         ambulance: '911',   general: '911'   },
  BR: { countryCode: 'BR', countryName: 'Brazil',         ambulance: '192',   general: '192'   }, // SAMU; 190 = police
  GB: { countryCode: 'GB', countryName: 'United Kingdom', ambulance: '999',   general: '999'   }, // 112 also works from mobile
  DE: { countryCode: 'DE', countryName: 'Germany',        ambulance: '112',   general: '112'   }, // 110 = police only
  FR: { countryCode: 'FR', countryName: 'France',         ambulance: '15',    general: '112'   }, // 15 = SAMU; 112 routes to same
  IT: { countryCode: 'IT', countryName: 'Italy',          ambulance: '118',   general: '112'   }, // 118 = ambulance; 112 = unified
  ES: { countryCode: 'ES', countryName: 'Spain',          ambulance: '112',   general: '112'   },
  BG: { countryCode: 'BG', countryName: 'Bulgaria',       ambulance: '112',   general: '112'   },
  PL: { countryCode: 'PL', countryName: 'Poland',         ambulance: '999',   general: '112'   }, // 999 = ambulance; 112 = EU unified
  NL: { countryCode: 'NL', countryName: 'Netherlands',    ambulance: '112',   general: '112'   },
  IL: { countryCode: 'IL', countryName: 'Israel',         ambulance: '101',   general: '101'   }, // 101 = MDA (national ambulance)
  AE: { countryCode: 'AE', countryName: 'UAE',            ambulance: '998',   general: '999'   }, // 998 = ambulance; 999 = police/fire
  ZA: { countryCode: 'ZA', countryName: 'South Africa',   ambulance: '10177', general: '10177' }, // 10111 = police
  AU: { countryCode: 'AU', countryName: 'Australia',      ambulance: '000',   general: '000'   }, // 112 from mobile also routes here
  IN: { countryCode: 'IN', countryName: 'India',          ambulance: '102',   general: '112'   }, // 102 = ambulance; 112 = national unified (2019)
  JP: { countryCode: 'JP', countryName: 'Japan',          ambulance: '119',   general: '119'   }, // 110 = police; 112 routes to police, NOT ambulance
  CN: { countryCode: 'CN', countryName: 'China',          ambulance: '120',   general: '120'   }, // 110 = police; 119 = fire; 112 routes to police
  KR: { countryCode: 'KR', countryName: 'South Korea',    ambulance: '119',   general: '119'   }, // 112 = police here
}

/**
 * Fallback when country is unknown.
 * 112 is the international GSM standard — mandated on all mobile networks worldwide.
 * Even countries with different primary numbers (US: 911, GB: 999) route 112 to their
 * emergency dispatch when dialled from a mobile.
 */
export const FALLBACK_EMERGENCY: CountryEmergencyInfo = {
  countryCode: '',
  countryName: 'International',
  ambulance: '112',
  general: '112',
}

/**
 * Return emergency numbers for a country code.
 * Returns FALLBACK_EMERGENCY (112) if the code is absent or unrecognised.
 */
export function getEmergencyInfo(countryCode: string | null | undefined): CountryEmergencyInfo {
  if (!countryCode) return FALLBACK_EMERGENCY
  return COUNTRY_EMERGENCY_MAP[countryCode.toUpperCase()] ?? FALLBACK_EMERGENCY
}

/** All country codes that have a specific entry in the map. */
export const SUPPORTED_EMERGENCY_COUNTRIES = Object.keys(COUNTRY_EMERGENCY_MAP)
