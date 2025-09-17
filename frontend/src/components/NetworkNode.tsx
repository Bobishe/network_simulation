import { NodeProps, useStore, Handle, Position } from 'reactflow'
import classNames from 'classnames'
import { CubeIcon } from '@heroicons/react/24/solid'

// PNG-картинки
import leoPng from '../img/leo.png'
import meoPng from '../img/meo.png'
import geoPng from '../img/geo.png'
import gndPng from '../img/gnd.png'
import hapsPng from '../img/hasp.png'

const typeImages: Record<string, string> = {
  leo: leoPng,
  meo: meoPng,
  geo: geoPng,
  gnd: gndPng,
  haps: hapsPng,
}

export default function NetworkNode({ data, type, selected, className }: NodeProps<any>) {
  const zoom = useStore(state => state.transform[2])
  const src = type ? typeImages[type] : undefined
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
        {src ? (
          <img
            src={src}
            alt={type || 'node'}
            className="w-2 h-2 object-contain"
            draggable={false}
          />
        ) : (
          <CubeIcon className="w-2 h-2" aria-hidden />
        )}
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
      {src ? (
        <img
          src={src}
          alt={type || 'node'}
          className="w-5 h-5 object-contain"
          draggable={false}
        />
      ) : (
        <CubeIcon className="w-4 h-4" aria-hidden />
      )}
      <span>{data?.label}</span>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  )
}
