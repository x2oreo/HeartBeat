// Centralized config for all external drug data APIs.
// All APIs are optional — the system degrades gracefully without them.

export const EXTERNAL_API_CONFIG = {
  rxnorm: {
    baseUrl: 'https://rxnav.nlm.nih.gov/REST',
    timeoutMs: 3000,
    enabled: true, // Free, no API key needed
  },
  crediblemeds: {
    baseUrl: 'https://api.crediblemeds.org/index.php/tools/json',
    timeoutMs: 3000,
    enabled: !!process.env.CREDIBLEMEDS_API_KEY,
    apiKey: process.env.CREDIBLEMEDS_API_KEY ?? '',
  },
  openfda: {
    baseUrl: 'https://api.fda.gov/drug',
    timeoutMs: 3000,
    enabled: true, // Free, no API key needed (40 req/min)
    apiKey: process.env.OPENFDA_API_KEY ?? '',
  },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
} as const
