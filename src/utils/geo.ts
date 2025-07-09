export const SCALE = 5

export function latLonToPos(lat: number, lon: number) {
  return { x: (lon + 180) * SCALE, y: (90 - lat) * SCALE }
}

export function posToLatLon(pos: { x: number; y: number }) {
  return { lat: 90 - pos.y / SCALE, lon: pos.x / SCALE - 180 }
}
