export const SCALE = 300

/**
 * Convert positive latitude/longitude values to canvas position.
 * Latitude is expected in range `[0, 180]` and longitude in `[0, 360]`.
 */
export function latLonToPos(lat: number, lon: number) {
  const normLat = lat - 90
  const normLon = lon - 180
  return { x: (normLon + 180) * SCALE, y: (90 - normLat) * SCALE }
}

/**
 * Convert canvas position back to positive latitude/longitude values.
 * Resulting latitude will be in `[0, 180]` and longitude in `[0, 360]`.
 */
export function posToLatLon(pos: { x: number; y: number }) {
  const lat = 90 - pos.y / SCALE
  const lon = pos.x / SCALE - 180
  return { lat: lat + 90, lon: lon + 180 }
}

export const EARTH_RADIUS_KM = 6371

/**
 * Returns great-circle distance between two coordinates in kilometers.
 * Inputs are positive latitude `[0,180]` and longitude `[0,360]`.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const lat1r = ((lat1 - 90) * Math.PI) / 180
  const lon1r = ((lon1 - 180) * Math.PI) / 180
  const lat2r = ((lat2 - 90) * Math.PI) / 180
  const lon2r = ((lon2 - 180) * Math.PI) / 180

  const dLat = lat2r - lat1r
  const dLon = lon2r - lon1r

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

import type { Node, Edge } from 'reactflow'

/**
 * Recalculate edge distances based on current node coordinates.
 */
export function updateEdgesDistances(nodes: Node[], edges: Edge[]): Edge[] {
  return edges.map(e => {
    const src = nodes.find(n => n.id === e.source)
    const tgt = nodes.find(n => n.id === e.target)
    if (src?.data && tgt?.data) {
      const distance = distanceKm(
        src.data.lat,
        src.data.lon,
        tgt.data.lat,
        tgt.data.lon
      )
      return {
        ...e,
        data: { ...e.data, distance },
        label: `${Math.round(distance)} km`,
      }
    }
    return e
  })
}
