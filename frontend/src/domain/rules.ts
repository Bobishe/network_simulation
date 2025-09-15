import { NodeType } from './types'

const CONNECTION_MATRIX: Record<NodeType, NodeType[]> = {
  [NodeType.AS]: [NodeType.SC, NodeType.HAPS, NodeType.ES],
  [NodeType.SC]: [NodeType.SC, NodeType.HAPS, NodeType.ES, NodeType.AS],
  [NodeType.HAPS]: [NodeType.SC, NodeType.HAPS, NodeType.ES, NodeType.AS],
  [NodeType.ES]: [NodeType.SC, NodeType.HAPS, NodeType.ES, NodeType.SSOP],
  [NodeType.SSOP]: [NodeType.ES],
}

export const isConnectionAllowed = (from: NodeType, to: NodeType): boolean =>
  CONNECTION_MATRIX[from]?.includes(to) ?? false
