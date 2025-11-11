/**
 * Station name normalization utilities for handling variations in station names
 * from the upstream Indonesian Commuterline API.
 */

/**
 * Normalizes station names by mapping known variations to standard names.
 * 
 * @param name - The station name to normalize
 * @returns The normalized station name, or the original name if no mapping exists
 */
export function normalizeStationName(name: string): string {
  const nameMap: Record<string, string> = {
    'TANJUNGPRIUK': 'TANJUNG PRIOK',
    'JAKARTAKOTA': 'JAKARTA KOTA',
    'KAMPUNGBANDAN': 'KAMPUNG BANDAN',
    'TANAHABANG': 'TANAH ABANG',
    'PARUNGPANJANG': 'PARUNG PANJANG',
    'BANDARASOEKARNOHATTA': 'BANDARA SOEKARNO HATTA',
  }
  
  return nameMap[name] || name
}

/**
 * Parses a route name string and extracts normalized origin and destination station names.
 * Route names are expected to be in the format "ORIGIN-DESTINATION".
 * 
 * @param routeName - The route name string (e.g., "BOGOR-JAKARTAKOTA")
 * @returns An object containing normalized origin and destination station names
 */
export function parseRouteName(routeName: string): {
  origin: string
  destination: string
} {
  const [origin, destination] = routeName.split('-')
  
  return {
    origin: normalizeStationName(origin.trim()),
    destination: normalizeStationName(destination.trim()),
  }
}
