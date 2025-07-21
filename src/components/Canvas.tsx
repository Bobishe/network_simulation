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
  useStore,
} from 'reactflow'
import type { NodeTypes, Node } from 'reactflow'
import NetworkNode from './NetworkNode'
import ClusterNode from './ClusterNode'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  addNode,
  addEdge,
  setElements,
  updateNode,
  removeElement,
  select,
  setAddingType,
} from '../features/network/networkSlice'
import {
  latLonToPos,
  posToLatLon,
  distanceKm,
  SCALE,
  updateEdgesDistances,
} from '../utils/geo'
import { ALTITUDE_RANGES } from '../utils/altitudes'
import { useCallback, useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'

const nodeTypes: NodeTypes = {
  leo: NetworkNode,
  meo: NetworkNode,
  geo: NetworkNode,
  gnd: NetworkNode,
  haps: NetworkNode,
  cluster: ClusterNode,
}

export default function Canvas() {
  const dispatch = useAppDispatch()
  const { nodes, edges, addingType } = useAppSelector(state => state.network)
  const reactFlow = useReactFlow()
  const transform = useStore(state => state.transform)
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [clusterInfo, setClusterInfo] = useState<{ position: { x: number; y: number }; nodes: Node[] } | null>(null)

  const displayNodes = useMemo(() => {
    const groups: Record<string, Node[]> = {}
    nodes.forEach(n => {
      const key = `${n.data?.lat ?? 0}-${n.data?.lon ?? 0}`
      if (!groups[key]) groups[key] = []
      groups[key].push(n)
    })
    const result: Node[] = []
    Object.entries(groups).forEach(([key, group]) => {
      if (group.length === 1) {
        result.push(group[0])
      } else {
        group.forEach(n =>
          result.push({ ...n, style: { ...(n.style || {}), display: 'none' } })
        )
        result.push({
          id: `cluster-${key}`,
          type: 'cluster',
          position: group[0].position,
          data: { nodes: group, count: group.length },
          draggable: false,
          selectable: false,
        })
      }
    })
    return result
  }, [nodes])

  const onConnect = useCallback(
    (params: Connection) => {
      const src = nodes.find(n => n.id === params.source)
      const tgt = nodes.find(n => n.id === params.target)
      let distance = 0
      if (src?.data && tgt?.data) {
        distance = distanceKm(
          src.data.lat,
          src.data.lon,
          tgt.data.lat,
          tgt.data.lon,
          src.data.altitude || 0,
          tgt.data.altitude || 0
        )
      }
      dispatch(
        addEdge({
          id: `${params.source}-${params.target}-${Date.now()}`,
          source: params.source!,
          target: params.target!,
          style: { stroke: 'black' },
          data: { distance },
          label: `${Math.round(distance)} km`,
        })
      )
    },
    [dispatch, nodes]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const changed = applyNodeChanges(changes, nodes)
      const updatedNodes = changed.map(n => {
        const { lat, lon } = posToLatLon(n.position)
        return { ...n, data: { ...n.data, lat, lon } }
      })
      const updatedEdges = updateEdgesDistances(updatedNodes, edges)
      dispatch(setElements({ nodes: updatedNodes, edges: updatedEdges }))
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
      const data: any = { label: id, lat, lon }
      if (ALTITUDE_RANGES[type]) {
        data.altitude = ALTITUDE_RANGES[type].min
      }
      dispatch(addNode({ id, type, position, data }))
      dispatch(setAddingType(null))
      toast.success('Узел добавлен')
    },
    [dispatch, reactFlow]
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClusterInfo(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className={`w-full h-full map-bg flex ${addingType ? 'cursor-crosshair' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        style={{ width: 360 * SCALE, height: 180 * SCALE }}
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (addingType === 'delete') {
            dispatch(removeElement(node.id))
            toast.success('Удалено')
          } else if (addingType === 'link') {
            if (!linkSource) {
              setLinkSource(node.id)
              dispatch(updateNode({ ...node, className: 'ring-2 ring-blue-500' }))
            } else {
              if (linkSource !== node.id) {
                const src = nodes.find(n => n.id === linkSource)
                const tgt = nodes.find(n => n.id === node.id)
                let distance = 0
                if (src?.data && tgt?.data) {
                  distance = distanceKm(
                    src.data.lat,
                    src.data.lon,
                    tgt.data.lat,
                    tgt.data.lon,
                    src.data.altitude || 0,
                    tgt.data.altitude || 0
                  )
                }
                const id = `e-${linkSource}-${node.id}-${Date.now()}`
                dispatch(
                  addEdge({
                    id,
                    source: linkSource,
                    target: node.id,
                    style: { stroke: 'black' },
                    data: { distance },
                    label: `${Math.round(distance)} km`,
                  })
                )
              }
              const srcNode = nodes.find(n => n.id === linkSource)
              if (srcNode) dispatch(updateNode({ ...srcNode, className: undefined }))
              setLinkSource(null)
              dispatch(setAddingType(null))
              toast.success('Связь создана')
            }
          } else if (node.type === 'cluster') {
            setClusterInfo({ position: node.position, nodes: node.data.nodes })
          } else {
            dispatch(select(node.id))
          }
        }}
        onEdgeClick={(_, edge) => {
          if (addingType === 'delete') {
            dispatch(removeElement(edge.id))
            toast.success('Удалено')
          } else if (addingType !== 'link') {
            dispatch(select(edge.id))
          }
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
      {clusterInfo && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setClusterInfo(null)}
        >
          <div
            className="absolute bg-white border rounded shadow text-xs"
            style={{
              left: clusterInfo.position.x * transform[2] + transform[0],
              top: clusterInfo.position.y * transform[2] + transform[1],
            }}
            onClick={e => e.stopPropagation()}
          >
            {clusterInfo.nodes.map(n => (
              <div
                key={n.id}
                className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  dispatch(select(n.id))
                  setClusterInfo(null)
                }}
              >
                {n.data?.label || n.id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
