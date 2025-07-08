import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Node, Edge } from 'reactflow'
import { NetworkState } from './types'

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
    setElements(state, action: PayloadAction<{ nodes: Node[]; edges: Edge[] }>) {
      state.nodes = action.payload.nodes
      state.edges = action.payload.edges
    },
    addNode(state, action: PayloadAction<Node>) {
      state.nodes.push(action.payload)
    },
    addEdge(state, action: PayloadAction<Edge>) {
      state.edges.push(action.payload)
    },
    updateNode(state, action: PayloadAction<Node>) {
      const idx = state.nodes.findIndex(n => n.id === action.payload.id)
      if (idx !== -1) state.nodes[idx] = action.payload
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
  removeElement,
  select,
  setAddingType,
} = networkSlice.actions
export default networkSlice.reducer
