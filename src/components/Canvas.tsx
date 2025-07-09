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
} from 'reactflow'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  addNode,
  addEdge,
  setElements,
  updateNode,
  select,
  setAddingType,
} from '../features/network/networkSlice'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function Canvas() {
  const dispatch = useAppDispatch()
  const { nodes, edges, addingType } = useAppSelector(state => state.network)
  const reactFlow = useReactFlow()
  const [linkSource, setLinkSource] = useState<string | null>(null)

  const onConnect = useCallback((params: Connection) => {
    dispatch(
      addEdge({
        id: `${params.source}-${params.target}-${Date.now()}`,
        source: params.source!,
        target: params.target!,
        style: { stroke: 'black' },
      })
    )
  }, [dispatch])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes)
      dispatch(setElements({ nodes: updatedNodes, edges }))
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
      dispatch(addNode({ id, type, position, data: { label: id } }))
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

  return (
    <div
      className={`w-full h-full bg-gray-50 flex ${addingType ? 'cursor-crosshair' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (addingType === 'link') {
            if (!linkSource) {
              setLinkSource(node.id)
              dispatch(updateNode({ ...node, className: 'ring-2 ring-blue-500' }))
            } else {
              if (linkSource !== node.id) {
                const id = `e-${linkSource}-${node.id}-${Date.now()}`
                dispatch(addEdge({ id, source: linkSource, target: node.id, style: { stroke: 'black' } }))
              }
              const srcNode = nodes.find(n => n.id === linkSource)
              if (srcNode) dispatch(updateNode({ ...srcNode, className: undefined }))
              setLinkSource(null)
              dispatch(setAddingType(null))
              toast.success('Связь создана')
            }
          } else {
            dispatch(select(node.id))
          }
        }}
        onEdgeClick={(_, edge) => addingType !== 'link' && dispatch(select(edge.id))}
        fitView
        snapToGrid
        snapGrid={[25, 25]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background size={2} color="#aaa" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
