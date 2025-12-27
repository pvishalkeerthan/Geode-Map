/**
 * Detect user's country from request headers (Vercel geo headers)
 * Falls back to IP-based detection if headers not available
 */
export async function detectUserCountry(
  headers?: Headers
): Promise<string | null> {
  // Try Vercel geo headers first (if deployed on Vercel)
  if (headers) {
    const country = headers.get('x-vercel-ip-country')
    if (country) {
      return country
    }
  }

  // Fallback: Try to detect from client-side
  // This will be called from the client component
  if (typeof window !== 'undefined') {
    try {
      // Using a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      return data.country_name || null
    } catch (error) {
      console.error('Error detecting country:', error)
      return null
    }
  }

  return null
}

/**
 * Normalize country name to match database format
 */
export function normalizeCountryName(country: string): string {
  return country.trim()
}

