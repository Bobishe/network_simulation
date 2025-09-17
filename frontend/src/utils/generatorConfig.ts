import { GeneratorConfig } from './interfaces'

const GENERATOR_MAP: Record<string, GeneratorConfig> = {
  as: {
    lambda: 1,
    typeData: 1,
    capacitySource: 'capacity',
    target: { nodeId: '', inPortId: undefined, inPortIdx: undefined },
  },
  ssop: {
    lambda: 1,
    typeData: 2,
    capacitySource: 'capacity',
    target: { nodeId: '', inPortId: undefined, inPortIdx: undefined },
  },
}

export const createDefaultGenerator = (type: string): GeneratorConfig | null => {
  const template = GENERATOR_MAP[type]
  return template ? { ...template, target: { ...template.target } } : null
}
