type NominatimAddress = {
  house_number?: string
  road?: string
  suburb?: string
  neighbourhood?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
}

type NominatimResult = {
  display_name: string
  address?: NominatimAddress
  error?: string
}

function isNominatimResult(data: unknown): data is NominatimResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'display_name' in data &&
    typeof (data as Record<string, unknown>).display_name === 'string'
  )
}

/**
 * Reverse geocodes lat/lng to a short, human-readable address using Nominatim (OpenStreetMap).
 *
 * - No API key required.
 * - 4-second timeout — SOS is time-critical, we cannot wait longer.
 * - Returns null on any error. Geocoding failure must NEVER break SOS delivery.
 *
 * Output format: "123 Road Name, City, Country"
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent: https://operations.osmfoundation.org/policies/nominatim/
        'User-Agent': 'HeartGuard/1.0 (emergency-medical-alert-app; contact@heartguard.app)',
        'Accept-Language': 'en',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return null

    const data: unknown = await res.json()
    if (!isNominatimResult(data)) return null
    if (data.error) return null

    const a = data.address
    if (!a) return data.display_name || null

    // Build a short, actionable address for emergency responders
    const parts: string[] = []

    const streetPart =
      a.house_number && a.road
        ? `${a.house_number} ${a.road}`
        : (a.road ?? null)
    if (streetPart) parts.push(streetPart)

    const cityPart = a.city ?? a.town ?? a.village ?? a.suburb ?? a.neighbourhood ?? null
    if (cityPart) parts.push(cityPart)

    if (a.country) parts.push(a.country)

    return parts.length > 0 ? parts.join(', ') : (data.display_name || null)
  } catch {
    // Never let geocoding break SOS
    return null
  }
}
