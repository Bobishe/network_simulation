export enum NodeType {
  AS = 'AS',
  SC = 'SC',
  HAPS = 'HAPS',
  ES = 'ES',
  SSOP = 'SSOP',
}

export type PortDir = 'in' | 'out'

export interface PortQueueConfig {
  q_in?: number
  q_out?: number
}

export interface PortServiceConfig {
  mu_in?: number
  mu_out?: number
  servers_in?: number
  servers_out?: number
  dist_in?: string
  dist_out?: string
}

export interface PortNextHopTerminal {
  terminal: 'to_AS' | 'to_SSOP'
}

export interface PortNextHopNode {
  nodeId: string
  inPortIdx: number
}

export type PortNextHop = PortNextHopTerminal | PortNextHopNode

export interface PortLinkPhysics {
  bandwidth?: number
  propDelay?: number
  packetSize?: number
}

export interface Port {
  id: string
  nodeId: string
  dir: PortDir
  idx: number
  label: string
  queue: PortQueueConfig
  service: PortServiceConfig
  persistent: boolean
  locked: boolean
  nextHop?: PortNextHop
  linkPhysics?: PortLinkPhysics
}

export interface NodeProcessingRoutingRule {
  type: number
  outPort: number
}

export interface NodeProcessing {
  serviceLines: number
  q: number
  mu: number
  dist?: string
  routingTable: NodeProcessingRoutingRule[]
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
  portIdx: number
}

export interface EdgeLinkConfig {
  distType?: string
  mu?: number
  tMean?: number
  lossProb?: number
  availability?: { mtbf: number; mttr: number }
}

export interface Edge {
  id: string
  from: EdgeEndpoint
  to?: EdgeEndpoint
  terminal?: 'to_AS' | 'to_SSOP'
  direction?: 'uni' | 'bi'
  label?: string
  link?: EdgeLinkConfig
  meta?: Record<string, unknown>
}

export interface SimulationConfig {
  duration: number
}

export interface TimeConfig {
  unit?: string
}

export interface RngConfig {
  seed?: number
}

export interface TrafficCapacityConfig {
  dist: string
  params: Record<string, number>
}

export interface TrafficConfig {
  capacity: TrafficCapacityConfig
}

export interface PacketConfig {
  mtu: number
}

export interface ModelConfig {
  model: { id: string }
  sim: SimulationConfig
  time?: TimeConfig
  rng?: RngConfig
  traffic: TrafficConfig
  packet: PacketConfig
  dataTypes?: number[]
}

export interface Topology {
  model: ModelConfig
  nodes: Node[]
  edges: Edge[]
}

export const createDefaultModelConfig = (): ModelConfig => ({
  model: { id: 'model-1' },
  sim: { duration: 1_000 },
  time: { unit: 's' },
  rng: { seed: 1 },
  traffic: { capacity: { dist: 'Deterministic', params: { minBytes: 1024, maxBytes: 1024 } } },
  packet: { mtu: 65_535 },
  dataTypes: [1, 2],
})
