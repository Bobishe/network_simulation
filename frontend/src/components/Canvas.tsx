import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  MarkerType,
} from 'reactflow'
import type { NodeTypes } from 'reactflow'
import NetworkNode from './NetworkNode'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  addNode,
  setElements,
  updateNode,
  select,
  setAddingType,
  openNearby,
  closeNearby,
  openNodeMenu,
  closeNodeMenu,
  closeInterfaces,
} from '../features/network/networkSlice'
import {
  latLonToPos,
  posToLatLon,
  distanceKm,
  SCALE,
  updateEdgesDistances,
} from '../utils/geo'
import { ALTITUDE_RANGES } from '../utils/altitudes'
import {
  addInterfaceToNode,
  createInterface,
  NodeData,
} from '../utils/interfaces'
import {
  createDefaultProcessing,
  generateNodeCode,
  hasProcessing,
} from '../utils/nodeProcessing'
import { useCallback, useEffect, useState } from 'react'
import NearbyPopup from './NearbyPopup'
import NodeContextMenu from './NodeContextMenu'
import InterfacesPopup from './InterfacesPopup'
import DeleteConfirmationDialog from './DeleteConfirmationDialog'
import toast from 'react-hot-toast'

const nodeTypes: NodeTypes = {
  leo: NetworkNode,
  meo: NetworkNode,
  geo: NetworkNode,
  gnd: NetworkNode,
  haps: NetworkNode,
}

export default function Canvas() {
  const dispatch = useAppDispatch()
  const { nodes, edges, addingType, selectedId } = useAppSelector(state => state.network)
  const reactFlow = useReactFlow()
  const [linkSource, setLinkSource] = useState<string | null>(null)

  const createConnection = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceNode = nodes.find(n => n.id === sourceId)
      const targetNode = nodes.find(n => n.id === targetId)
      if (!sourceNode || !targetNode) return

      const edgeId = `e-${sourceId}-${targetId}-${Date.now()}`
      let distance = 0
      const sourceData = sourceNode.data as NodeData | undefined
      const targetData = targetNode.data as NodeData | undefined
      if (
        typeof sourceData?.lat === 'number' &&
        typeof sourceData.lon === 'number' &&
        typeof targetData?.lat === 'number' &&
        typeof targetData.lon === 'number'
      ) {
        distance = distanceKm(
          sourceData.lat,
          sourceData.lon,
          targetData.lat,
          targetData.lon,
          Number(sourceData.altitude ?? 0),
          Number(targetData.altitude ?? 0)
        )
      }

      const edge: Edge = {
        id: edgeId,
        source: sourceNode.id,
        target: targetNode.id,
        style: { stroke: 'black' },
        data: { distance },
        label: `${Math.round(distance)} km`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'black',
        },
      }

      const sourceWithInterface = addInterfaceToNode(
        sourceNode,
        createInterface({
          node: sourceNode,
          direction: 'out',
          edgeId,
          connectedNode: targetNode,
        })
      )

      const updatedSource =
        sourceNode.className === 'ring-2 ring-blue-500'
          ? { ...sourceWithInterface, className: undefined }
          : { ...sourceWithInterface, className: sourceNode.className }

      const updatedTarget = addInterfaceToNode(
        targetNode,
        createInterface({
          node: targetNode,
          direction: 'in',
          edgeId,
          connectedNode: sourceNode,
        })
      )

      const updatedNodes = nodes.map(node => {
        if (node.id === updatedSource.id) return updatedSource
        if (node.id === updatedTarget.id) return updatedTarget
        return node
      })

      dispatch(setElements({ nodes: updatedNodes, edges: [...edges, edge] }))
    },
    [dispatch, edges, nodes]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return
      createConnection(params.source, params.target)
      dispatch(closeNodeMenu())
      dispatch(closeInterfaces())
    },
    [createConnection, dispatch]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!changes.length) return

      const movedNodeIds = new Set(
        changes.filter(change => change.type === 'position').map(change => change.id)
      )

      const previousNodes = new Map(nodes.map(node => [node.id, node]))
      const nextNodes = applyNodeChanges(changes, nodes)

      let nodesChanged = nextNodes.length !== nodes.length
      let coordinatesChanged = false

      const nodesWithCoords = nextNodes.map(node => {
        const prevNode = previousNodes.get(node.id)

        if (!nodesChanged && prevNode !== node) {
          nodesChanged = true
        }

        if (!movedNodeIds.has(node.id)) {
          return node
        }

        if (
          prevNode &&
          (prevNode.position.x !== node.position.x ||
            prevNode.position.y !== node.position.y)
        ) {
          coordinatesChanged = true
        }

        const { lat, lon } = posToLatLon(node.position)
        const prevLat = prevNode?.data?.lat
        const prevLon = prevNode?.data?.lon
        const currentLat = node.data?.lat
        const currentLon = node.data?.lon

        if (prevLat === lat && prevLon === lon && currentLat === lat && currentLon === lon) {
          return node
        }

        coordinatesChanged = true
        nodesChanged = true

        return {
          ...node,
          data: { ...(node.data ?? {}), lat, lon },
        }
      })

      if (!nodesChanged && !coordinatesChanged) return

      const updatedEdges = coordinatesChanged
        ? updateEdgesDistances(nodesWithCoords, edges)
        : edges

      dispatch(setElements({ nodes: nodesWithCoords, edges: updatedEdges }))
    },
    [dispatch, nodes, edges]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges)
      dispatch(setElements({ nodes, edges: updatedEdges }))
    },
    [dispatch, nodes, edges]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const id = `${type}-${Date.now()}`
      const { lat, lon } = posToLatLon(position)
      const data: NodeData = { label: id, lat, lon, interfaces: [] }
      if (ALTITUDE_RANGES[type]) {
        data.altitude = ALTITUDE_RANGES[type].min
      }
      if (hasProcessing(type)) {
        const code = generateNodeCode(type, nodes)
        if (code) data.code = code
        data.processing = createDefaultProcessing()
      }
      dispatch(addNode({ id, type, position, data }))
      dispatch(setAddingType(null))
      toast.success('Узел добавлен')
    },
    [dispatch, reactFlow, nodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  useEffect(() => {
    if (addingType !== 'link' && linkSource) {
      const srcNode = nodes.find(n => n.id === linkSource)
      if (srcNode) dispatch(updateNode({ ...srcNode, className: undefined }))
      setLinkSource(null)
    }
  }, [addingType, linkSource, nodes, dispatch])

  return (
    <div
      className={`w-full h-full map-bg flex ${addingType ? 'cursor-crosshair' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        style={{ width: 360 * SCALE, height: 180 * SCALE }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed, color: 'black' },
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault()
          const width = 160
          const leftBoundary = 80
          const rightBoundary = window.innerWidth - (selectedId ? 320 : 0)
          let x = event.clientX
          let y = event.clientY
          if (x + width > rightBoundary) x = rightBoundary - width - 10
          if (x < leftBoundary) x = leftBoundary + 10
          dispatch(openNodeMenu({ nodeId: node.id, x, y }))
        }}
        onNodeClick={(event, node) => {
          dispatch(closeNodeMenu())
          dispatch(closeInterfaces())
          if (addingType === 'link') {
            if (!linkSource) {
              setLinkSource(node.id)
              dispatch(updateNode({ ...node, className: 'ring-2 ring-blue-500' }))
            } else {
              if (linkSource !== node.id) {
                createConnection(linkSource, node.id)
              } else {
                const srcNode = nodes.find(n => n.id === linkSource)
                if (srcNode) dispatch(updateNode({ ...srcNode, className: undefined }))
              }
              setLinkSource(null)
              dispatch(setAddingType(null))
              toast.success('Связь создана')
            }
            dispatch(closeNearby())
          } else {
            const lat = node.data?.lat
            const lon = node.data?.lon
            if (lat == null || lon == null) {
              dispatch(select(node.id))
              dispatch(closeNearby())
              return
            }
            const nearbyIds = nodes
              .filter(n => {
                if (!n.data) return false
                return (
                  Math.abs(n.data.lat - lat) <= 0.5 &&
                  Math.abs(n.data.lon - lon) <= 0.5
                )
              })
              .map(n => n.id)
            if (nearbyIds.length <= 1) {
              dispatch(closeNearby())
              dispatch(select(node.id))
            } else {
              const width = 240
              const leftBoundary = 80
              const rightBoundary = window.innerWidth - (selectedId ? 320 : 0)
              let x = event.clientX
              let y = event.clientY
              if (x + width > rightBoundary) x = rightBoundary - width - 10
              if (x < leftBoundary) x = leftBoundary + 10
              dispatch(openNearby({ ids: nearbyIds, x, y }))
            }
          }
        }}
        onEdgeClick={(_, edge) => {
          dispatch(closeNodeMenu())
          dispatch(closeInterfaces())
          if (addingType !== 'link') {
            dispatch(select(edge.id))
          }
          dispatch(closeNearby())
        }}
        onPaneClick={() => {
          dispatch(closeNodeMenu())
          dispatch(closeInterfaces())
        }}
        fitView
        snapToGrid
        snapGrid={[SCALE / 60, SCALE / 60]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background size={2} color="#aaa" />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <NearbyPopup />
      <NodeContextMenu />
      <InterfacesPopup />
      <DeleteConfirmationDialog />
    </div>
  )
}
