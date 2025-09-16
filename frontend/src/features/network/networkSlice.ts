import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Node, Edge } from 'reactflow'
import {
  ensureAllEdgeInterfaces,
  normalizeNodeInterfaces,
  parseInterfaceSelectionId,
  removeInterfacesByEdgeIds,
} from '../../utils/interfaces'
import type { NodeData, NodeInterface } from '../../utils/interfaces'
import { NetworkState } from './types'

const initialState: NetworkState = {
  nodes: [],
  edges: [],
  topologyId: null,
  selectedId: null,
  addingType: null,
  nearby: null,
  contextMenu: null,
  interfacePopup: null,
}

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setElements(
      state,
      action: PayloadAction<{ nodes: Node<NodeData>[]; edges: Edge[] }>
    ) {
      state.nodes = action.payload.nodes
      state.edges = action.payload.edges
    },
    setTopology(
      state,
      action: PayloadAction<{
        id: number
        nodes: Node<NodeData>[]
        edges: Edge[]
      }>
    ) {
      state.topologyId = action.payload.id
      const normalizedNodes = action.payload.nodes.map(node => {
        const data = { ...(node.data ?? {}) }
        if (Array.isArray(data.interfaces)) {
          data.interfaces = (data.interfaces as NodeInterface[]).map(iface => ({
            ...iface,
          }))
        }
        return normalizeNodeInterfaces({ ...node, data })
      })
      state.nodes = ensureAllEdgeInterfaces(normalizedNodes, action.payload.edges)
      state.edges = action.payload.edges
      state.selectedId = null
      state.nearby = null
      state.contextMenu = null
      state.interfacePopup = null
    },
    addNode(state, action: PayloadAction<Node<NodeData>>) {
      state.nodes.push(action.payload)
    },
    addEdge(state, action: PayloadAction<Edge>) {
      state.edges.push(action.payload)
    },
    updateNode(state, action: PayloadAction<Node<NodeData>>) {
      const idx = state.nodes.findIndex(n => n.id === action.payload.id)
      if (idx !== -1) state.nodes[idx] = action.payload
    },
    updateEdge(state, action: PayloadAction<Edge>) {
      const idx = state.edges.findIndex(e => e.id === action.payload.id)
      if (idx !== -1) state.edges[idx] = action.payload
    },
    removeElement(state, action: PayloadAction<string>) {
      const id = action.payload
      state.contextMenu = null
      state.interfacePopup = null

      const selection = parseInterfaceSelectionId(state.selectedId)
      let removedEdgeIds: string[] = []

      const nodeIndex = state.nodes.findIndex(n => n.id === id)
      if (nodeIndex !== -1) {
        removedEdgeIds = state.edges
          .filter(e => e.source === id || e.target === id)
          .map(e => e.id)
        state.nodes = state.nodes.filter(n => n.id !== id)
        state.edges = state.edges.filter(
          e => e.id !== id && e.source !== id && e.target !== id
        )
      } else {
        const edgeIndex = state.edges.findIndex(e => e.id === id)
        if (edgeIndex !== -1) {
          removedEdgeIds = [state.edges[edgeIndex].id]
          state.edges.splice(edgeIndex, 1)
        }
      }

      if (removedEdgeIds.length > 0) {
        state.nodes = state.nodes.map(node =>
          removeInterfacesByEdgeIds(node, removedEdgeIds)
        )
      }

      if (state.nearby && state.nearby.ids.includes(id)) {
        state.nearby = null
      }

      if (selection) {
        const exists = state.nodes.some(node => {
          if (node.id !== selection.nodeId) return false
          if (!node.data || !Array.isArray(node.data.interfaces)) return false
          return (node.data.interfaces as NodeInterface[]).some(
            iface => iface.id === selection.interfaceId
          )
        })
        if (!exists) state.selectedId = null
      } else if (
        state.selectedId === id ||
        (state.selectedId && removedEdgeIds.includes(state.selectedId))
      ) {
        state.selectedId = null
      }
    },
    select(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
      state.contextMenu = null
      state.interfacePopup = null
    },
    setAddingType(state, action: PayloadAction<string | null>) {
      state.addingType = action.payload
      if (action.payload !== null) {
        state.nearby = null
        state.contextMenu = null
        state.interfacePopup = null
      }
    },
    openNearby(
      state,
      action: PayloadAction<{ ids: string[]; x: number; y: number }>
    ) {
      state.nearby = action.payload
      state.contextMenu = null
      state.interfacePopup = null
    },
    closeNearby(state) {
      state.nearby = null
    },
    openNodeMenu(
      state,
      action: PayloadAction<{ nodeId: string; x: number; y: number }>
    ) {
      state.contextMenu = action.payload
      state.nearby = null
      state.interfacePopup = null
    },
    closeNodeMenu(state) {
      state.contextMenu = null
    },
    openInterfaces(
      state,
      action: PayloadAction<{ nodeId: string; x: number; y: number }>
    ) {
      state.interfacePopup = action.payload
      state.contextMenu = null
    },
    closeInterfaces(state) {
      state.interfacePopup = null
    },
  },
})

export const {
  setElements,
  setTopology,
  addNode,
  addEdge,
  updateNode,
  updateEdge,
  removeElement,
  select,
  setAddingType,
  openNearby,
  closeNearby,
  openNodeMenu,
  closeNodeMenu,
  openInterfaces,
  closeInterfaces,
} = networkSlice.actions
export default networkSlice.reducer
