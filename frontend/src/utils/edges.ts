import type { Edge } from 'reactflow'

const OFFSET_STEP_PX = 5

const createGroupKey = (edge: Edge): string => {
  const source = edge.source ?? ''
  const target = edge.target ?? ''
  return [source, target].sort().join('|')
}

const sortById = (a: Edge, b: Edge) => {
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

const getCenteredOffsets = (count: number): number[] => {
  if (count <= 0) return []
  const mid = (count - 1) / 2
  return Array.from({ length: count }, (_, idx) => (idx - mid) * OFFSET_STEP_PX)
}

const getDirectionalOffsets = (count: number, direction: -1 | 1): number[] => {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, idx) => direction * (idx + 0.5) * OFFSET_STEP_PX)
}

export const prepareEdges = (edges: Edge[]): Edge[] => {
  if (!edges.length) {
    return edges
  }

  const groups = new Map<string, Edge[]>()

  edges.forEach(edge => {
    const key = createGroupKey(edge)
    const group = groups.get(key)
    if (group) {
      group.push(edge)
    } else {
      groups.set(key, [edge])
    }
  })

  const offsets = new Map<string, number>()

  groups.forEach(group => {
    const forward = group
      .filter(edge => (edge.source ?? '') <= (edge.target ?? ''))
      .sort(sortById)
    const backward = group
      .filter(edge => (edge.source ?? '') > (edge.target ?? ''))
      .sort(sortById)

    const hasBoth = forward.length > 0 && backward.length > 0

    const forwardOffsets = hasBoth
      ? getDirectionalOffsets(forward.length, -1)
      : getCenteredOffsets(forward.length)

    const backwardOffsets = hasBoth
      ? getDirectionalOffsets(backward.length, 1)
      : getCenteredOffsets(backward.length)

    forward.forEach((edge, idx) => {
      offsets.set(edge.id, forwardOffsets[idx] ?? 0)
    })

    backward.forEach((edge, idx) => {
      offsets.set(edge.id, backwardOffsets[idx] ?? 0)
    })
  })

  return edges.map(edge => {
    const offset = offsets.get(edge.id) ?? 0
    return {
      ...edge,
      type: edge.type ?? 'floating',
      data: { ...edge.data, parallelOffset: offset },
    }
  })
}
