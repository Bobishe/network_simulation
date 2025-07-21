import { Node, Edge } from 'reactflow'

export interface RFNodeEx extends Node {
  hidden?: boolean
}

export interface NetworkState {
  nodes: RFNodeEx[]
  edges: Edge[]
  selectedId: string | null
  addingType: string | null
}
