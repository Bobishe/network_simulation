import { Node, useStore } from 'reactflow'
import { useAppDispatch, useAppSelector } from '../hooks'
import { select } from '../features/network/networkSlice'
import {
  CubeIcon,
  CubeTransparentIcon,
  HomeModernIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/solid'
import classNames from 'classnames'

const typeIcons: Record<string, React.ComponentType<any>> = {
  leo: CubeIcon,
  meo: CubeTransparentIcon,
  geo: CubeIcon,
  gnd: HomeModernIcon,
  haps: PaperAirplaneIcon,
}

export default function GroupedNodesOverlay({ nodes }: { nodes: Node[] }) {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(state => state.network.selectedId)
  const [tx, ty, zoom] = useStore(state => state.transform)
  const first = nodes[0]
  const left = first.position.x * zoom + tx
  const top = first.position.y * zoom + ty

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
      }}
      className="bg-white border rounded text-xs"
    >
      {nodes.map((node, idx) => {
        const Icon = typeIcons[node.type || ''] || CubeIcon
        const ring = node.type === 'geo'
        return (
          <div
            key={node.id}
            onClick={e => {
              e.stopPropagation()
              dispatch(select(node.id))
            }}
            className={classNames(
              'flex items-center gap-1 px-2 py-1 cursor-pointer',
              { 'border-t': idx > 0 },
              { 'ring-1 ring-current': ring },
              { 'ring-2 ring-blue-500': selectedId === node.id }
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{node.data?.label}</span>
          </div>
        )
      })}
    </div>
  )
}
