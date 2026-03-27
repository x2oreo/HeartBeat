'use client'

import { useState } from 'react'
import {
  COUNTRIES,
  parseE164,
  toE164,
  validateNationalNumber,
  type CountryPhone,
} from '@/lib/phone-countries'

type PhoneInputProps = {
  value: string
  onChange: (e164Value: string) => void
  error?: string
  defaultCountryCode?: string
}

function initFromValue(
  value: string,
  defaultCountryCode: string,
): { country: CountryPhone; national: string } {
  const fallback = COUNTRIES.find((c) => c.code === defaultCountryCode) ?? COUNTRIES[0]
  if (!value) return { country: fallback, national: '' }
  const parsed = parseE164(value)
  return { country: parsed.country, national: parsed.nationalNumber }
}

export default function PhoneInput({
  value,
  onChange,
  error,
  defaultCountryCode = 'US',
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryPhone>(
    () => initFromValue(value, defaultCountryCode).country,
  )
  const [nationalNumber, setNationalNumber] = useState(
    () => initFromValue(value, defaultCountryCode).national,
  )

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const country = COUNTRIES.find((c) => c.code === e.target.value)
    if (!country) return
    setSelectedCountry(country)
    onChange(toE164(country.dialCode, nationalNumber))
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    setNationalNumber(digits)
    onChange(toE164(selectedCountry.dialCode, digits))
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className="w-[110px] shrink-0 px-2 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition text-sm"
          aria-label="Country code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dialCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder="Phone number"
          className={`flex-1 min-w-0 px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${
            error ? 'border-[#FF3B30]' : 'border-separator'
          }`}
        />
      </div>
      {error && (
        <p className="text-xs text-[#FF3B30] mt-1">{error}</p>
      )}
    </div>
  )
}

export { validateNationalNumber, parseE164 }
