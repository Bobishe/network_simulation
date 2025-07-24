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
 * Returns straight-line distance between two points in kilometers.
 * Latitude and longitude inputs are in positive ranges `[0,180]` and `[0,360]`.
 * Altitudes are in kilometers above Earth's surface.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  alt1 = 0,
  alt2 = 0
) {
  const lat1r = ((lat1 - 90) * Math.PI) / 180
  const lon1r = ((lon1 - 180) * Math.PI) / 180
  const lat2r = ((lat2 - 90) * Math.PI) / 180
  const lon2r = ((lon2 - 180) * Math.PI) / 180

  const r1 = EARTH_RADIUS_KM + alt1
  const r2 = EARTH_RADIUS_KM + alt2

  const x1 = r1 * Math.cos(lat1r) * Math.cos(lon1r)
  const y1 = r1 * Math.cos(lat1r) * Math.sin(lon1r)
  const z1 = r1 * Math.sin(lat1r)

  const x2 = r2 * Math.cos(lat2r) * Math.cos(lon2r)
  const y2 = r2 * Math.cos(lat2r) * Math.sin(lon2r)
  const z2 = r2 * Math.sin(lat2r)

  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2)
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
        tgt.data.lon,
        src.data.altitude || 0,
        tgt.data.altitude || 0
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
