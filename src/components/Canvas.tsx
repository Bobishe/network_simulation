import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useReactFlow,
} from 'reactflow'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  addNode,
  addEdge,
  setElements,
  select,
  setAddingType,
} from '../features/network/networkSlice'
import { useCallback } from 'react'
import toast from 'react-hot-toast'

export default function Canvas() {
  const dispatch = useAppDispatch()
  const { nodes, edges, addingType } = useAppSelector(state => state.network)
  const reactFlow = useReactFlow()

  const onConnect = useCallback((params: Edge) => dispatch(addEdge(params)), [dispatch])
  const onNodesChange = useCallback(
    (nodes: Node[]) => dispatch(setElements({ nodes, edges })),
    [dispatch, edges]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const bounds = event.currentTarget.getBoundingClientRect()
      const position = reactFlow.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
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
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => dispatch(select(node.id))}
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
