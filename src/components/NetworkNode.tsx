import { NodeProps, useStore, Handle, Position } from 'reactflow'
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

export default function NetworkNode({ data, type, selected, className }: NodeProps<any>) {
  const zoom = useStore(state => state.transform[2])
  const Icon = typeIcons[type] || CubeIcon
  const ring = type === 'geo'

  if (zoom < 0.3) {
    return (
      <div
        className={classNames(
          'flex items-center justify-center rounded-full bg-white border',
          { 'ring-1 ring-current': ring },
          { 'ring-2 ring-blue-500': selected },
          className
        )}
        style={{ width: 8, height: 8 }}
      >
        <Handle type="target" position={Position.Left} className="w-1 h-1" />
        <Icon className="w-2 h-2" />
        <Handle type="source" position={Position.Right} className="w-1 h-1" />
      </div>
    )
  }

  return (
    <div
      className={classNames(
        'bg-white border rounded px-2 py-1 text-xs flex items-center gap-1',
        { 'ring-1 ring-current': ring },
        { 'ring-2 ring-blue-500': selected },
        className
      )}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <Icon className="w-4 h-4" />
      <span>{data?.label}</span>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  )
}
