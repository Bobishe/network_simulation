import { Node, useStore } from 'reactflow'
import { useAppDispatch, useAppSelector } from '../hooks'
import { select } from '../features/network/networkSlice'
import leoPng from '../img/leo.png'
import meoPng from '../img/meo.png'
import geoPng from '../img/geo.png'
import esPng from '../img/es.png'
import hapsPng from '../img/hasp.png' 
import classNames from 'classnames'

const typeIcons: Record<string, string> = {
  leo: leoPng,
  meo: meoPng,
  geo: geoPng,
  es: esPng,
  haps: hapsPng,
}

export default function GroupedNodesOverlay({ nodes }: { nodes: Node[] }) {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(state => state.network.selectedId)
  const [tx, ty, zoom] = useStore(state => state.transform)

  if (!nodes?.length) return null

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
      className="bg-white border rounded text-xs shadow-sm"
    >
      {nodes.map((node, idx) => {
        const src = typeIcons[node.type || '']
        const ring = node.type === 'geo'
        return (
          <div
            key={node.id}
            onClick={(e) => {
              e.stopPropagation()
              dispatch(select(node.id))
            }}
            className={classNames(
              'flex items-center gap-1 px-2 py-1 cursor-pointer',
              { 'border-t': idx > 0 },
              { 'ring-1 ring-current rounded': ring },
              { 'ring-2 ring-blue-500 rounded': selectedId === node.id }
            )}
          >
     
              <img
                src={src}
                alt={node.type || 'node'}
                className="w-4 h-4 object-contain"
                draggable={false}
              />
      
            <span>{node.data?.label}</span>
          </div>
        )
      })}
    </div>
  )
}
