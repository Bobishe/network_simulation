export enum NodeType {
  AS = 'AS',
  SC = 'SC',
  HAPS = 'HAPS',
  ES = 'ES',
  SSOP = 'SSOP',
}

export type PortDir = 'in' | 'out'

export interface PortParams {
  q: number
  mu: number
}

export interface Port {
  id: string
  nodeId: string
  dir: PortDir
  idx: number
  label: string
  params: PortParams
  persistent: boolean
  locked: boolean
}

export interface NodeProcessing {
  serviceLines: number
  q: number
  mu: number
}

export interface NodePosition {
  x: number
  y: number
}

export interface Node {
  id: string
  type: NodeType
  name: string
  position: NodePosition
  inPorts: Port[]
  outPorts: Port[]
  processing?: NodeProcessing
  meta?: Record<string, unknown>
}

export interface EdgeEndpoint {
  nodeId: string
  portId: string
}

export interface Edge {
  id: string
  from: EdgeEndpoint
  to: EdgeEndpoint
  meta?: Record<string, unknown>
}

export interface Topology {
  nodes: Node[]
  edges: Edge[]
}
