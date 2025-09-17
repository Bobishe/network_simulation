import { Topology, createDefaultModelConfig } from './types'

export const exportTopology = (topology: Topology): string =>
  JSON.stringify(topology)

export const importTopology = (json: string): Topology => {
  const parsed = JSON.parse(json)
  if (!parsed.model) {
    parsed.model = createDefaultModelConfig()
  }
  return parsed as Topology
}
