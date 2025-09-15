import { Topology } from './types'

export const exportTopology = (topology: Topology): string =>
  JSON.stringify(topology)

export const importTopology = (json: string): Topology => {
  const parsed = JSON.parse(json)
  return parsed as Topology
}
