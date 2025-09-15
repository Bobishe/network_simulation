import { Node, Edge } from 'reactflow'

export interface NetworkState {
  nodes: Node[]
  edges: Edge[]
  selectedId: string | null
  addingType: string | null
  nearby: { ids: string[]; x: number; y: number } | null
}
