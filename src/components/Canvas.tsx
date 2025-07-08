import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow'
import { useAppDispatch, useAppSelector } from '../hooks'
import { addNode, addEdge, setElements, select } from '../features/network/networkSlice'
import { useCallback } from 'react'

export default function Canvas() {
  const dispatch = useAppDispatch()
  const { nodes, edges } = useAppSelector(state => state.network)

  const onConnect = useCallback((params: Edge) => dispatch(addEdge(params)), [dispatch])
  const onNodesChange = useCallback((nodes: Node[]) => dispatch(setElements({ nodes, edges })), [dispatch, edges])

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => dispatch(select(node.id))}
      >
        <Background size={2} color="#aaa" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
