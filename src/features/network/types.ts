import { Node, Edge } from 'react-flow-renderer'

export interface NetworkState {
  nodes: Node[]
  edges: Edge[]
  selectedId: string | null
}
