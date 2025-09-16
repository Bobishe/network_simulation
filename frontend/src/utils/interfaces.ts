import type { Edge, Node } from 'reactflow'

export type InterfaceDirection = 'in' | 'out'

export interface NodeInterface {
  id: string
  name: string
  direction: InterfaceDirection
  edgeId: string
  connectedNodeId: string
  connectedNodeLabel: string
  description: string
}

export interface NodeData {
  label?: string
  lat?: number
  lon?: number
  altitude?: number
  location?: string
  interfaces?: NodeInterface[]
  [key: string]: unknown
}

export interface InterfaceSelection {
  nodeId: string
  interfaceId: string
}

const INTERFACE_SELECTION_PREFIX = 'iface'

export const directionLabels: Record<InterfaceDirection, string> = {
  in: 'Входящий',
  out: 'Исходящий',
}

export const createInterfaceId = (): string =>
  `${INTERFACE_SELECTION_PREFIX}-${Math.random().toString(36).slice(2, 10)}`

export const createInterfaceSelectionId = (
  nodeId: string,
  interfaceId: string
): string => `${INTERFACE_SELECTION_PREFIX}:${nodeId}:${interfaceId}`

export const parseInterfaceSelectionId = (
  value: string | null | undefined
): InterfaceSelection | null => {
  if (!value) return null
  const parts = value.split(':')
  if (parts.length !== 3) return null
  const [prefix, nodeId, interfaceId] = parts
  if (prefix !== INTERFACE_SELECTION_PREFIX || !nodeId || !interfaceId) {
    return null
  }
  return { nodeId, interfaceId }
}

const getInterfaces = (node: Node<NodeData>): NodeInterface[] => {
  if (!node.data || !Array.isArray(node.data.interfaces)) return []
  return node.data.interfaces as NodeInterface[]
}

export const addInterfaceToNode = (
  node: Node<NodeData>,
  iface: NodeInterface
): Node<NodeData> => {
  const interfaces = getInterfaces(node)
  return {
    ...node,
    data: {
      ...(node.data ?? {}),
      interfaces: [...interfaces, iface],
    },
  }
}

export const createInterface = (
  params: {
    node: Node<NodeData>
    direction: InterfaceDirection
    edgeId: string
    connectedNode: Node<NodeData>
  }
): NodeInterface => {
  const { node, direction, edgeId, connectedNode } = params
  const interfaces = getInterfaces(node)
  const count = interfaces.filter(iface => iface.direction === direction).length
  const baseLabel =
    direction === 'out' ? 'Исходящий интерфейс' : 'Входящий интерфейс'
  return {
    id: createInterfaceId(),
    name: `${baseLabel} ${count + 1}`,
    direction,
    edgeId,
    connectedNodeId: connectedNode.id,
    connectedNodeLabel: connectedNode.data?.label
      ? String(connectedNode.data.label)
      : connectedNode.id,
    description: '',
  }
}

export const ensureInterfacesForEdge = (
  nodes: Node<NodeData>[],
  edge: Edge
): Node<NodeData>[] => {
  const sourceIndex = nodes.findIndex(n => n.id === edge.source)
  const targetIndex = nodes.findIndex(n => n.id === edge.target)
  if (sourceIndex === -1 || targetIndex === -1) return nodes

  let sourceNode = nodes[sourceIndex]
  let targetNode = nodes[targetIndex]

  const sourceHasInterface = getInterfaces(sourceNode).some(
    iface => iface.edgeId === edge.id && iface.direction === 'out'
  )
  if (!sourceHasInterface) {
    const newInterface = createInterface({
      node: sourceNode,
      direction: 'out',
      edgeId: edge.id,
      connectedNode: targetNode,
    })
    sourceNode = addInterfaceToNode(sourceNode, newInterface)
  }

  const targetHasInterface = getInterfaces(targetNode).some(
    iface => iface.edgeId === edge.id && iface.direction === 'in'
  )
  if (!targetHasInterface) {
    const newInterface = createInterface({
      node: targetNode,
      direction: 'in',
      edgeId: edge.id,
      connectedNode: sourceNode,
    })
    targetNode = addInterfaceToNode(targetNode, newInterface)
  }

  const updated = [...nodes]
  updated[sourceIndex] = sourceNode
  updated[targetIndex] = targetNode
  return updated
}

export const ensureAllEdgeInterfaces = (
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[] => {
  return edges.reduce((acc, edge) => ensureInterfacesForEdge(acc, edge), nodes)
}

export const removeInterfacesByEdgeIds = (
  node: Node<NodeData>,
  edgeIds: string[]
): Node<NodeData> => {
  if (!node.data || !Array.isArray(node.data.interfaces)) return node
  const interfaces = node.data.interfaces as NodeInterface[]
  const filtered = interfaces.filter(iface => !edgeIds.includes(iface.edgeId))
  if (filtered.length === interfaces.length) return node
  return {
    ...node,
    data: { ...(node.data ?? {}), interfaces: filtered },
  }
}

export const updateConnectedLabels = (
  nodes: Node<NodeData>[],
  nodeId: string,
  newLabel: string
): Node<NodeData>[] => {
  return nodes.map(node => {
    if (!node.data || !Array.isArray(node.data.interfaces)) return node
    const interfaces = node.data.interfaces as NodeInterface[]
    const updated = interfaces.map(iface =>
      iface.connectedNodeId === nodeId
        ? { ...iface, connectedNodeLabel: newLabel }
        : iface
    )
    const hasChanges = interfaces.some(
      (iface, idx) => iface.connectedNodeId === nodeId && updated[idx] !== iface
    )
    if (!hasChanges) return node
    return { ...node, data: { ...(node.data ?? {}), interfaces: updated } }
  })
}
