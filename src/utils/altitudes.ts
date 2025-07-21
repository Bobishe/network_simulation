export interface AltitudeRange {
  min: number;
  max: number;
}

export const ALTITUDE_RANGES: Record<string, AltitudeRange> = {
  leo: { min: 150, max: 2000 },
  meo: { min: 8000, max: 15000 },
  geo: { min: 36000, max: 36000 },
  haps: { min: 10, max: 50 },
};
