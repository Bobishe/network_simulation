import type { Node, Edge } from 'reactflow'
import type { NodeData } from '../../utils/interfaces'
import type { ModelConfig } from '../../domain/types'
import type { GPSSConfig } from '../../domain/gpss'

export interface NetworkState {
  nodes: Node<NodeData>[]
  edges: Edge[]
  model: ModelConfig
  gpss: GPSSConfig
  topologyId: number | null
  selectedId: string | null
  addingType: string | null
  nearby: { ids: string[]; x: number; y: number } | null
  contextMenu: { nodeId: string; x: number; y: number } | null
  interfacePopup: { nodeId: string; x: number; y: number } | null
  deleteConfirmation:
    | { elementId: string; elementType: 'node' | 'edge'; label?: string }
    | null
}
