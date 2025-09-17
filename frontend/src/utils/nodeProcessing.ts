import type { Node } from 'reactflow'
import type { NodeData, ProcessingConfig, RoutingRule } from './interfaces'

const CODE_PREFIX_MAP: Record<string, string> = {
  leo: 'SC',
  meo: 'SC',
  geo: 'SC',
  haps: 'HAPS',
  gnd: 'ES',
}

const PROCESSING_NODE_TYPES = new Set(['leo', 'meo', 'geo', 'haps', 'gnd'])

export const hasProcessing = (type?: string | null): boolean =>
  !!type && PROCESSING_NODE_TYPES.has(type)

export const getCodePrefix = (type?: string | null): string | null => {
  if (!type) return null
  return CODE_PREFIX_MAP[type] ?? null
}

export const createDefaultProcessing = (): ProcessingConfig => ({
  serviceLines: 1,
  queue: 0,
  mu: 1,
  routing: [
    { type: 1, outPort: 1 },
    { type: 2, outPort: 2 },
  ],
})

export const normalizeRouting = (routing?: RoutingRule[]): RoutingRule[] => {
  if (!Array.isArray(routing) || routing.length === 0) {
    const defaults = createDefaultProcessing()
    return defaults.routing
  }

  return routing.map(rule => {
    const type = Math.max(1, Math.floor(Number(rule.type)))
    const outPort = Math.max(1, Math.floor(Number(rule.outPort)))
    return { type, outPort }
  })
}

export const normalizeProcessing = (
  config?: Partial<ProcessingConfig> | null
): ProcessingConfig => {
  const defaults = createDefaultProcessing()
  if (!config) return defaults

  const serviceLines =
    typeof config.serviceLines === 'number' && config.serviceLines >= 1
      ? Math.floor(config.serviceLines)
      : defaults.serviceLines

  const queue =
    typeof config.queue === 'number' && config.queue >= 0
      ? Math.floor(config.queue)
      : defaults.queue

  const mu =
    typeof config.mu === 'number' && config.mu > 0 ? config.mu : defaults.mu

  const routing = normalizeRouting(config.routing)

  return { serviceLines, queue, mu, routing }
}

export const generateNodeCode = (
  type: string | undefined,
  nodes: Node<NodeData>[]
): string | null => {
  const prefix = getCodePrefix(type)
  if (!prefix) return null

  const used = new Set<number>()
  nodes.forEach(node => {
    const code = node.data?.code
    if (typeof code !== 'string') return
    if (!code.startsWith(prefix)) return
    const suffix = parseInt(code.slice(prefix.length), 10)
    if (!Number.isNaN(suffix)) {
      used.add(suffix)
    }
  })

  let idx = 1
  while (used.has(idx)) {
    idx += 1
  }

  return `${prefix}${idx}`
}
