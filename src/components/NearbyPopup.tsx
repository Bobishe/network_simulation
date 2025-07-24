import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { closeNearby, select } from '../features/network/networkSlice'

export default function NearbyPopup() {
  const dispatch = useAppDispatch()
  const { nearby, nodes } = useAppSelector(state => state.network)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        dispatch(closeNearby())
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dispatch])

  if (!nearby) return null

  const items = nodes.filter(n => nearby.ids.includes(n.id))

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', left: nearby.x, top: nearby.y, width: 240 }}
      className="bg-white border rounded shadow z-50 text-sm"
      onClick={e => e.stopPropagation()}
    >
      <div className="max-h-60 overflow-y-auto">
        {items.map(node => (
          <div
            key={node.id}
            onClick={() => {
              dispatch(select(node.id))
              dispatch(closeNearby())
            }}
            className="px-2 py-1 cursor-pointer hover:bg-gray-100"
          >
            {node.data?.label || node.id}
          </div>
        ))}
      </div>
      <div className="border-t flex justify-end">
        <button
          type="button"
          className="px-3 py-1 text-sm"
          onClick={() => dispatch(closeNearby())}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
