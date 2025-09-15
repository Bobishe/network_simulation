import { useViewport } from 'reactflow'

export default function ScaleIndicator() {
  const { zoom } = useViewport()
  return (
    <div className="absolute bottom-2 left-2 bg-white/80 px-2 py-1 text-xs pointer-events-none rounded">
      Масштаб: {(zoom * 100).toFixed(0)}%
    </div>
  )
}
