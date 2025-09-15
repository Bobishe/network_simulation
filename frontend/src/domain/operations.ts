import { Edge, Node, Port, PortDir, Topology } from './types'
import { isConnectionAllowed } from './rules'

const generateId = (): string =>
  Math.random().toString(36).slice(2, 10)

const getNextPortIdx = (node: Node, dir: PortDir): number => {
  const ports = dir === 'in' ? node.inPorts : node.outPorts
  const maxIdx = ports.reduce((max, p) => Math.max(max, p.idx), 0)
  return maxIdx + 1
}

const isPortFree = (topology: Topology, portId: string): boolean =>
  !topology.edges.some(
    (e) => e.from.portId === portId || e.to.portId === portId
  )

const updatePort = (
  node: Node,
  portId: string,
  changes: Partial<Port>
): Node => {
  const update = (ports: Port[]): Port[] =>
    ports.map((p) => (p.id === portId ? { ...p, ...changes } : p))
  if (node.inPorts.some((p) => p.id === portId)) {
    return { ...node, inPorts: update(node.inPorts) }
  }
  if (node.outPorts.some((p) => p.id === portId)) {
    return { ...node, outPorts: update(node.outPorts) }
  }
  return node
}

const addPort = (
  node: Node,
  dir: PortDir,
  partial?: Partial<Omit<Port, 'dir' | 'idx' | 'nodeId' | 'id'>>
): { node: Node; port: Port } => {
  const idx = getNextPortIdx(node, dir)
  const port: Port = {
    id: generateId(),
    nodeId: node.id,
    dir,
    idx,
    label: `${dir}-${idx}`,
    params: { q: 0, mu: 0 },
    persistent: false,
    locked: false,
    ...partial,
  }
  const ports = dir === 'in' ? node.inPorts : node.outPorts
  const newNode =
    dir === 'in'
      ? { ...node, inPorts: [...ports, port] }
      : { ...node, outPorts: [...ports, port] }
  return { node: newNode, port }
}

export interface ConnectParams {
  sourceNodeId: string
  sourcePortId?: string
  targetNodeId: string
  targetPortId?: string
}

export const onConnect = (
  topology: Topology,
  { sourceNodeId, sourcePortId, targetNodeId, targetPortId }: ConnectParams
): Topology => {
  const sourceNode = topology.nodes.find((n) => n.id === sourceNodeId)
  const targetNode = topology.nodes.find((n) => n.id === targetNodeId)
  if (!sourceNode || !targetNode) {
    throw new Error('Unknown node')
  }

  let updatedSource = sourceNode
  let sourcePort: Port
  if (sourcePortId) {
    const port = sourceNode.outPorts.find((p) => p.id === sourcePortId)
    if (!port) throw new Error('Source port not found')
    if (port.dir !== 'out') throw new Error('Source port must be out')
    sourcePort = port
  } else {
    const result = addPort(sourceNode, 'out')
    updatedSource = result.node
    sourcePort = result.port
  }

  let updatedTarget = targetNode
  let targetPort: Port | undefined
  if (targetPortId) {
    const port = targetNode.inPorts.find((p) => p.id === targetPortId)
    if (!port) throw new Error('Target port not found')
    if (port.dir !== 'in') throw new Error('Target port must be in')
    targetPort = port
  } else {
    const freePorts = targetNode.inPorts
      .filter((p) => isPortFree(topology, p.id))
      .sort((a, b) => a.idx - b.idx)
    targetPort = freePorts[0]
    if (!targetPort) {
      const result = addPort(targetNode, 'in')
      updatedTarget = result.node
      targetPort = result.port
    }
  }
  if (!targetPort) throw new Error('Target port missing')

  if (!isConnectionAllowed(sourceNode.type, targetNode.type)) {
    throw new Error('Connection not allowed')
  }

  if (
    topology.edges.some(
      (e) => e.from.portId === sourcePort.id && e.to.portId === targetPort!.id
    )
  ) {
    throw new Error('Duplicate edge')
  }

  updatedSource = updatePort(updatedSource, sourcePort.id, { persistent: true })
  updatedTarget = updatePort(updatedTarget, targetPort.id, { persistent: true })

  const edge: Edge = {
    id: generateId(),
    from: { nodeId: sourceNode.id, portId: sourcePort.id },
    to: { nodeId: targetNode.id, portId: targetPort.id },
  }

  const nodes = topology.nodes.map((n) => {
    if (n.id === updatedSource.id) return updatedSource
    if (n.id === updatedTarget.id) return updatedTarget
    return n
  })

  return { nodes, edges: [...topology.edges, edge] }
}

export const removeEdge = (topology: Topology, edgeId: string): Topology => {
  const edge = topology.edges.find((e) => e.id === edgeId)
  if (!edge) return topology
  const edges = topology.edges.filter((e) => e.id !== edgeId)

  const cleanPort = (node: Node, portId: string): Node => {
    const ports = node.inPorts.some((p) => p.id === portId)
      ? node.inPorts
      : node.outPorts
    const dir: PortDir = node.inPorts.some((p) => p.id === portId)
      ? 'in'
      : 'out'
    const port = ports.find((p) => p.id === portId)
    if (!port) return node
    const stillUsed = edges.some(
      (e) => e.from.portId === portId || e.to.portId === portId
    )
    if (!stillUsed && !port.persistent && !port.locked) {
      const newPorts = ports.filter((p) => p.id !== portId)
      return dir === 'in'
        ? { ...node, inPorts: newPorts }
        : { ...node, outPorts: newPorts }
    }
    return node
  }

  const nodes = topology.nodes.map((n) => {
    if (n.id === edge.from.nodeId) return cleanPort(n, edge.from.portId)
    if (n.id === edge.to.nodeId) return cleanPort(n, edge.to.portId)
    return n
  })

  return { nodes, edges }
}

export const helpers = {
  getNextPortIdx,
  addPort,
}
