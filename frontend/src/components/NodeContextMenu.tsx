import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  closeNodeMenu,
  openInterfaces,
} from '../features/network/networkSlice'

export default function NodeContextMenu() {
  const dispatch = useAppDispatch()
  const { contextMenu, selectedId } = useAppSelector(state => state.network)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        dispatch(closeNodeMenu())
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dispatch])

  if (!contextMenu) return null

  const width = 160
  const leftBoundary = 80
  const rightBoundary = window.innerWidth - (selectedId ? 320 : 0)
  let left = contextMenu.x
  let top = contextMenu.y
  if (left + width > rightBoundary) left = rightBoundary - width - 10
  if (left < leftBoundary) left = leftBoundary + 10

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', left, top, width }}
      className="bg-white border rounded shadow z-50 text-sm"
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          dispatch(openInterfaces({ nodeId: contextMenu.nodeId, x: left, y: top }))
          dispatch(closeNodeMenu())
        }}
      >
        Интерфейсы
      </button>
    </div>
  )
}
