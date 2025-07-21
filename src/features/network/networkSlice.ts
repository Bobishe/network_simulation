import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Edge } from 'reactflow'
import { NetworkState, RFNodeEx } from './types'

export function groupNodes(nodes: RFNodeEx[]): RFNodeEx[] {
  const map = new Map<string, RFNodeEx[]>()
  nodes
    // ignore previously generated cluster nodes to avoid recursive grouping
    .filter(n => n.type !== 'cluster')
    .forEach(n => {
      const key = `${n.position.x}|${n.position.y}`
      map.set(key, [...(map.get(key) ?? []), n])
    })

  const result: RFNodeEx[] = []
  for (const [key, group] of map) {
    if (group.length === 1) {
      result.push({ ...group[0], hidden: false })
    } else {
      group.forEach(n => result.push({ ...n, hidden: true }))
      const [x, y] = key.split('|').map(Number)
      result.push({
        id: `cluster-${key}`,
        type: 'cluster',
        position: { x, y },
        data: { members: group.map(n => n.id), size: group.length },
      } as RFNodeEx)
    }
  }
  return result
}

const initialState: NetworkState = {
  nodes: [],
  edges: [],
  selectedId: null,
  addingType: null,
}

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setElements(
      state,
      action: PayloadAction<{ nodes: RFNodeEx[]; edges: Edge[] }>
    ) {
      state.nodes = action.payload.nodes
      state.edges = action.payload.edges
    },
    addNode(state, action: PayloadAction<RFNodeEx>) {
      state.nodes.push(action.payload)
    },
    addEdge(state, action: PayloadAction<Edge>) {
      state.edges.push(action.payload)
    },
    updateNode(state, action: PayloadAction<RFNodeEx>) {
      const idx = state.nodes.findIndex(n => n.id === action.payload.id)
      if (idx !== -1) state.nodes[idx] = action.payload
    },
    updateEdge(state, action: PayloadAction<Edge>) {
      const idx = state.edges.findIndex(e => e.id === action.payload.id)
      if (idx !== -1) state.edges[idx] = action.payload
    },
    removeElement(state, action: PayloadAction<string>) {
      state.nodes = state.nodes.filter(n => n.id !== action.payload)
      state.edges = state.edges.filter(e => e.id !== action.payload && e.source !== action.payload && e.target !== action.payload)
    },
    select(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
    },
    setAddingType(state, action: PayloadAction<string | null>) {
      state.addingType = action.payload
    },
  },
})

export const {
  setElements,
  addNode,
  addEdge,
  updateNode,
  updateEdge,
  removeElement,
  select,
  setAddingType,
} = networkSlice.actions
export default networkSlice.reducer
