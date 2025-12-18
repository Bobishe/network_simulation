import type { Edge as ChannelConfig } from '../domain/types'
import type { Edge as ReactFlowEdge, Node } from 'reactflow'
import type { NodeData, NodeInterface } from './interfaces'

export type ChannelEdgeData = {
  channel?: ChannelConfig
  distance?: number
  parallelOffset?: number
  [key: string]: unknown
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const convertLegacyBandwidth = (edgeData: unknown): number | undefined => {
  if (!edgeData || typeof edgeData !== 'object') return undefined
  const value = toNumber((edgeData as Record<string, unknown>).bandwidth)
  if (typeof value !== 'number') return undefined
  // Previous UI stored bandwidth in Mbit/s. Convert to bytes per second.
  return (value * 1_000_000) / 8
}

const convertLegacyLatency = (edgeData: unknown): number | undefined => {
  if (!edgeData || typeof edgeData !== 'object') return undefined
  const value = toNumber((edgeData as Record<string, unknown>).latency)
  if (typeof value !== 'number') return undefined
  // Previous UI stored latency in milliseconds. Convert to seconds.
  return value / 1_000
}

const getInterfaces = (
  node: Node<NodeData> | undefined,
  edgeId: string,
  direction: 'in' | 'out'
): NodeInterface | undefined => {
  if (!node || !node.data || !Array.isArray(node.data.interfaces)) return undefined
  return (node.data.interfaces as NodeInterface[]).find(
    iface => iface.edgeId === edgeId && iface.direction === direction
  )
}

export const ensureEdgeChannel = (
  edge: ReactFlowEdge<ChannelEdgeData>,
  nodes: Node<NodeData>[]
): ChannelConfig => {
  const existing = (edge.data?.channel ?? null) as ChannelConfig | null
  const sourceNode = nodes.find(node => node.id === edge.source)
  const targetNode = nodes.find(node => node.id === edge.target)

  const sourceInterface = getInterfaces(sourceNode, edge.id, 'out')
  const targetInterface = getInterfaces(targetNode, edge.id, 'in')

  const fromNodeId = existing?.from.nodeId ?? edge.source ?? sourceNode?.id ?? ''
  const fromOutIdx =
    existing?.from.outPortIdx ?? sourceInterface?.idx ?? 1
  const fromPortId = sourceInterface?.id ?? existing?.from.portId

  let to: ChannelConfig['to']
  if (existing?.to.kind === 'terminal') {
    to = {
      kind: 'terminal',
      terminal: existing.to.terminal,
    }
  } else {
    const nodeId =
      (existing?.to.kind === 'node' && existing.to.nodeId) ??
      targetNode?.id ??
      ''
    const inPortIdx =
      (existing?.to.kind === 'node' && existing.to.inPortIdx) ??
      targetInterface?.idx ??
      1
    const portId = targetInterface?.id ?? (existing?.to.kind === 'node' ? existing.to.portId : undefined)
    to = {
      kind: 'node',
      nodeId,
      inPortIdx,
      portId,
    }
  }

  const label = existing?.label ?? (typeof edge.label === 'string' ? edge.label : undefined)

  const direction = existing?.direction ?? 'uni'
  const muPolicy = existing?.muPolicy ?? 'manual'
  const bandwidth =
    existing?.bandwidth ?? (existing ? undefined : convertLegacyBandwidth(edge.data))
  const propDelay =
    existing?.propDelay ?? (existing ? undefined : convertLegacyLatency(edge.data))

  return {
    id: edge.id,
    from: {
      nodeId: fromNodeId,
      outPortIdx: fromOutIdx,
      portId: fromPortId,
    },
    to,
    direction,
    label,
    bandwidth,
    propDelay,
    packetSize: existing?.packetSize,
    muPolicy,
    link: existing?.link,
    meta: existing?.meta,
  }
}

export const attachChannelData = (
  edges: ReactFlowEdge<ChannelEdgeData>[],
  nodes: Node<NodeData>[]
): ReactFlowEdge<ChannelEdgeData>[] => {
  return edges.map(edge => {
    const channel = ensureEdgeChannel(edge, nodes)
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        channel,
      },
    }
  })
}

export const estimateServiceRateFromPhysics = (
  bandwidth?: number,
  packetSize?: number,
  propDelay?: number
): number | null => {
  const bw = typeof bandwidth === 'number' && bandwidth > 0 ? bandwidth : null
  const size = typeof packetSize === 'number' && packetSize > 0 ? packetSize : null
  const delay = typeof propDelay === 'number' && propDelay >= 0 ? propDelay : 0
  if (!bw || !size) return null
  const serviceTime = delay + size / bw
  if (serviceTime <= 0) return null
  return 1 / serviceTime
}
