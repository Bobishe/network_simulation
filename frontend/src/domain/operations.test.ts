import { describe, it, expect } from 'vitest'
import {
  Node,
  NodeType,
  Topology,
  createDefaultModelConfig,
  onConnect,
  removeEdge,
  exportTopology,
  importTopology,
} from './index'

const makeNode = (id: string, type: NodeType): Node => ({
  id,
  type,
  name: type + id,
  position: { x: 0, y: 0 },
  inPorts: [],
  outPorts: [],
})

const emptyTopology = (nodes: Node[]): Topology => ({
  model: createDefaultModelConfig(),
  nodes,
  edges: [],
})

describe('auto indexing and connection', () => {
  it('creates ports automatically and keeps indices stable', () => {
    const a = makeNode('a', NodeType.SC)
    const b = makeNode('b', NodeType.HAPS)
    let topo = emptyTopology([a, b])

    topo = onConnect(topo, { sourceNodeId: 'a', targetNodeId: 'b' })
    expect(topo.edges).toHaveLength(1)
    const edge1 = topo.edges[0]
    const sourcePort1 = topo.nodes.find((n) => n.id === 'a')!.outPorts[0]
    const targetPort1 = topo.nodes.find((n) => n.id === 'b')!.inPorts[0]
    expect(sourcePort1.idx).toBe(1)
    expect(targetPort1.idx).toBe(1)

    topo = onConnect(topo, { sourceNodeId: 'a', targetNodeId: 'b' })
    expect(topo.edges).toHaveLength(2)
    const sourcePort2 = topo.nodes.find((n) => n.id === 'a')!.outPorts[1]
    const targetPort2 = topo.nodes.find((n) => n.id === 'b')!.inPorts[1]
    expect(sourcePort2.idx).toBe(2)
    expect(targetPort2.idx).toBe(2)

    topo = removeEdge(topo, edge1.id)
    const remainingPort = topo.nodes.find((n) => n.id === 'a')!.outPorts.find((p) => p.idx === 2)
    expect(remainingPort).toBeDefined()
  })
})

describe('connection matrix', () => {
  it('allows ES -> SSOP and SSOP -> ES', () => {
    let topo = emptyTopology([
      makeNode('es', NodeType.ES),
      makeNode('ss', NodeType.SSOP),
    ])
    topo = onConnect(topo, { sourceNodeId: 'es', targetNodeId: 'ss' })
    expect(topo.edges).toHaveLength(1)

    topo = onConnect(topo, { sourceNodeId: 'ss', targetNodeId: 'es' })
    expect(topo.edges).toHaveLength(2)
  })

  it('forbids connection into SSOP from other types', () => {
    const topo = emptyTopology([
      makeNode('sc', NodeType.SC),
      makeNode('ss', NodeType.SSOP),
    ])
    expect(() =>
      onConnect(topo, { sourceNodeId: 'sc', targetNodeId: 'ss' })
    ).toThrowError()
  })
})

describe('port policies and self-loop', () => {
  it('blocks connection to occupied port', () => {
    let topo = emptyTopology([
      makeNode('a', NodeType.SC),
      makeNode('b', NodeType.ES),
    ])
    topo = onConnect(topo, { sourceNodeId: 'a', targetNodeId: 'b' })
    const targetPortId = topo.nodes.find((n) => n.id === 'b')!.inPorts[0].id
    expect(() =>
      onConnect(topo, {
        sourceNodeId: 'a',
        targetNodeId: 'b',
        targetPortId,
      })
    ).toThrowError()
  })

  it('prevents self loop', () => {
    const topo = emptyTopology([makeNode('a', NodeType.SC)])
    expect(() =>
      onConnect(topo, { sourceNodeId: 'a', targetNodeId: 'a' })
    ).toThrowError()
  })
})

describe('edge removal cleanup', () => {
  it('removes non persistent ports when edge deleted', () => {
    const a: Node = {
      ...makeNode('a', NodeType.SC),
      outPorts: [
        {
          id: 'p1',
          nodeId: 'a',
          dir: 'out',
          idx: 1,
          label: 'p1',
          queue: { q_out: 0 },
          service: { mu_out: 1 },
          persistent: false,
          locked: false,
        },
      ],
    }
    const b: Node = {
      ...makeNode('b', NodeType.ES),
      inPorts: [
        {
          id: 'p2',
          nodeId: 'b',
          dir: 'in',
          idx: 1,
          label: 'p2',
          queue: { q_in: 0 },
          service: { mu_in: 1 },
          persistent: false,
          locked: false,
        },
      ],
    }
    const topo: Topology = {
      model: createDefaultModelConfig(),
      nodes: [a, b],
      edges: [
        {
          id: 'e1',
          from: { nodeId: 'a', portId: 'p1', outPortIdx: 1 },
          to: { kind: 'node', nodeId: 'b', portId: 'p2', inPortIdx: 1 },
          direction: 'uni',
          muPolicy: 'manual',
        },
      ],
    }
    const updated = removeEdge(topo, 'e1')
    expect(updated.edges).toHaveLength(0)
    expect(updated.nodes.find((n) => n.id === 'a')!.outPorts).toHaveLength(0)
    expect(updated.nodes.find((n) => n.id === 'b')!.inPorts).toHaveLength(0)
  })
})

describe('import/export', () => {
  it('restores topology from JSON', () => {
    let topo = emptyTopology([
      makeNode('a', NodeType.SC),
      makeNode('b', NodeType.HAPS),
    ])
    topo = onConnect(topo, { sourceNodeId: 'a', targetNodeId: 'b' })
    const json = exportTopology(topo)
    const restored = importTopology(json)
    expect(restored).toEqual(topo)
  })
})
