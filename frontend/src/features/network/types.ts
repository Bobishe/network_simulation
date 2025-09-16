import type { Node, Edge } from 'reactflow'
import type { NodeData } from '../../utils/interfaces'

export interface NetworkState {
  nodes: Node<NodeData>[]
  edges: Edge[]
  topologyId: number | null
  selectedId: string | null
  addingType: string | null
  nearby: { ids: string[]; x: number; y: number } | null
  contextMenu: { nodeId: string; x: number; y: number } | null
  interfacePopup: { nodeId: string; x: number; y: number } | null
}
