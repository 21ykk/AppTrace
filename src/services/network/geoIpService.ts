/**
 * IP Geolocation and Network Intelligence Service
 * Resolves country, city, ISP/Org and flag emoji for IP addresses with
 * offline private subnet detection and persistent caching.
 */

export interface GeoIpInfo {
  ip: string
  isPrivate: boolean
  country: string
  countryCode: string
  flag: string
  city?: string
  region?: string
  isp?: string
  org?: string
  timezone?: string
}

// In-memory cache
const memoryCache = new Map<string, GeoIpInfo>()
const CACHE_STORAGE_KEY = 'apptrace_geoip_cache_v1'

// Load persistent cache from localStorage
try {
  const stored = localStorage.getItem(CACHE_STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as Record<string, GeoIpInfo>
    Object.entries(parsed).forEach(([ip, info]) => memoryCache.set(ip, info))
  }
} catch {
  // Ignore localStorage parsing errors
}

function saveCache() {
  try {
    const obj: Record<string, GeoIpInfo> = {}
    let count = 0
    // Only persist up to 400 entries
    for (const [ip, info] of memoryCache.entries()) {
      if (count++ > 400) break
      obj[ip] = info
    }
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // Ignore storage quota
  }
}

/**
 * Converts a 2-letter ISO country code into a Unicode flag emoji
 */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐'
  const upper = code.toUpperCase()
  if (upper === 'LO' || upper === 'LAN') return '🏠'
  try {
    const codePoints = upper
      .split('')
      .map((c) => 127397 + c.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  } catch {
    return '🌐'
  }
}

/**
 * Checks if an IP is a private/local/loopback address
 */
export function checkPrivateIp(ip: string): GeoIpInfo | null {
  const cleanIp = ip.trim().replace(/^::ffff:/, '')

  if (!cleanIp || cleanIp === '0.0.0.0' || cleanIp === '::' || cleanIp === '*') {
    return {
      ip: cleanIp,
      isPrivate: true,
      country: 'Any / Wildcard',
      countryCode: 'ANY',
      flag: '📡',
      city: 'Broadcast / All Interfaces',
    }
  }

  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.toLowerCase() === 'localhost') {
    return {
      ip: cleanIp,
      isPrivate: true,
      country: 'Localhost',
      countryCode: 'LOCAL',
      flag: '💻',
      city: 'Loopback Adapter',
      org: 'Local Workstation',
    }
  }

  // IPv4 private ranges
  // 10.0.0.0 – 10.255.255.255
  // 172.16.0.0 – 172.31.255.255
  // 192.168.0.0 – 192.168.255.255
  // 169.254.0.0 – 169.254.255.255 (Link-Local)
  const parts = cleanIp.split('.').map(Number)
  if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
    const [p0, p1] = parts
    if (
      p0 === 10 ||
      (p0 === 172 && p1 >= 16 && p1 <= 31) ||
      (p0 === 192 && p1 === 168) ||
      (p0 === 169 && p1 === 254)
    ) {
      return {
        ip: cleanIp,
        isPrivate: true,
        country: 'Local Subnet',
        countryCode: 'LAN',
        flag: '🏠',
        city: 'Private Network',
        org: 'Local Router / LAN',
      }
    }
  }

  // IPv6 local ranges: fe80::, fc00::, fd00::
  const lower = cleanIp.toLowerCase()
  if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
    return {
      ip: cleanIp,
      isPrivate: true,
      country: 'Local Subnet (IPv6)',
      countryCode: 'LAN',
      flag: '🏠',
      city: 'IPv6 Link-Local / ULA',
      org: 'Local Network',
    }
  }

  return null
}

// Offline provider heuristics for instant resolution without network delay
function checkKnownCloudProvider(ip: string): GeoIpInfo | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return null
  const [p0, p1] = parts

  // Cloudflare DNS: 1.1.1.1, 1.0.0.1
  if ((p0 === 1 && p1 === 1 && parts[2] === 1 && parts[3] === 1) || (p0 === 1 && p1 === 0 && parts[2] === 0 && parts[3] === 1)) {
    return {
      ip,
      isPrivate: false,
      country: 'United States',
      countryCode: 'US',
      flag: '🇺🇸',
      city: 'Anycast DNS',
      org: 'Cloudflare, Inc.',
      isp: 'Cloudflare 1.1.1.1',
    }
  }

  // Google Public DNS: 8.8.8.8, 8.8.4.4
  if (p0 === 8 && p1 === 8) {
    return {
      ip,
      isPrivate: false,
      country: 'United States',
      countryCode: 'US',
      flag: '🇺🇸',
      city: 'Anycast DNS',
      org: 'Google LLC',
      isp: 'Google Public DNS',
    }
  }

  // Quad9: 9.9.9.9
  if (p0 === 9 && p1 === 9 && parts[2] === 9 && parts[3] === 9) {
    return {
      ip,
      isPrivate: false,
      country: 'Switzerland',
      countryCode: 'CH',
      flag: '🇨🇭',
      city: 'Zurich Anycast',
      org: 'Quad9',
      isp: 'Quad9 DNS',
    }
  }

  return null
}

// Ongoing fetch requests to prevent duplicate network calls
const pendingRequests = new Map<string, Promise<GeoIpInfo>>()

/**
 * Resolves Geolocation info for an IP address.
 * Returns cached or private info immediately; initiates async fetch for external IPs.
 */
export async function resolveIpGeo(ip: string): Promise<GeoIpInfo> {
  const cleanIp = ip.trim().replace(/^::ffff:/, '')

  // 1. Check private IP
  const privateInfo = checkPrivateIp(cleanIp)
  if (privateInfo) return privateInfo

  // 2. Check memory cache
  if (memoryCache.has(cleanIp)) {
    return memoryCache.get(cleanIp)!
  }

  // 3. Check known cloud provider
  const known = checkKnownCloudProvider(cleanIp)
  if (known) {
    memoryCache.set(cleanIp, known)
    return known
  }

  // 4. Check if request is already in-flight
  if (pendingRequests.has(cleanIp)) {
    return pendingRequests.get(cleanIp)!
  }

  // 5. Fetch from public GeoIP API (ipwho.is has full CORS, zero-config, fast JSON)
  const fetchPromise = (async () => {
    try {
      const resp = await fetch(`https://ipwho.is/${cleanIp}`, {
        headers: { Accept: 'application/json' },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()

      if (data && data.success) {
        const flagEmoji = data.flag?.emoji || countryCodeToFlag(data.country_code)
        const info: GeoIpInfo = {
          ip: cleanIp,
          isPrivate: false,
          country: data.country || 'Unknown Country',
          countryCode: data.country_code || 'UN',
          flag: flagEmoji,
          city: data.city || data.region,
          region: data.region,
          org: data.connection?.org || data.org || data.connection?.isp,
          isp: data.connection?.isp || data.isp,
          timezone: data.timezone?.id,
        }
        memoryCache.set(cleanIp, info)
        saveCache()
        return info
      }
    } catch {
      // Fallback API if ipwho.is is blocked or offline
      try {
        const resp2 = await fetch(`https://freeipapi.com/api/json/${cleanIp}`)
        if (resp2.ok) {
          const data2 = await resp2.json()
          if (data2 && data2.countryCode) {
            const info2: GeoIpInfo = {
              ip: cleanIp,
              isPrivate: false,
              country: data2.countryName || 'Unknown Country',
              countryCode: data2.countryCode,
              flag: countryCodeToFlag(data2.countryCode),
              city: data2.cityName,
              region: data2.regionName,
            }
            memoryCache.set(cleanIp, info2)
            saveCache()
            return info2
          }
        }
      } catch {
        // Fallback failed
      }
    }

    // Default unknown public IP response
    const fallback: GeoIpInfo = {
      ip: cleanIp,
      isPrivate: false,
      country: 'Public IP',
      countryCode: 'EXT',
      flag: '🌐',
      city: 'External Network',
    }
    memoryCache.set(cleanIp, fallback)
    return fallback
  })()

  pendingRequests.set(cleanIp, fetchPromise)
  try {
    const res = await fetchPromise
    return res
  } finally {
    pendingRequests.delete(cleanIp)
  }
}

/**
 * Synchronous cache lookup for instantaneous rendering without awaiting
 */
export function getCachedIpGeo(ip: string): GeoIpInfo | null {
  const cleanIp = ip.trim().replace(/^::ffff:/, '')
  const priv = checkPrivateIp(cleanIp)
  if (priv) return priv
  if (memoryCache.has(cleanIp)) return memoryCache.get(cleanIp)!
  const known = checkKnownCloudProvider(cleanIp)
  if (known) {
    memoryCache.set(cleanIp, known)
    return known
  }
  return null
}
