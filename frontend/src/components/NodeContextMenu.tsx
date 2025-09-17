import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  closeNodeMenu,
  openInterfaces,
  openDeleteConfirmation,
} from '../features/network/networkSlice'

export default function NodeContextMenu() {
  const dispatch = useAppDispatch()
  const { contextMenu, selectedId, nodes } = useAppSelector(state => state.network)
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

  const node = nodes.find(n => n.id === contextMenu.nodeId)
  const nodeLabel = node?.data?.label ? String(node.data.label) : contextMenu.nodeId

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', left, top, width }}
      className="bg-white border rounded shadow z-50 text-sm divide-y"
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
      <button
        type="button"
        className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
        onClick={() => {
          dispatch(
            openDeleteConfirmation({
              elementId: contextMenu.nodeId,
              elementType: 'node',
              label: nodeLabel,
            })
          )
          dispatch(closeNodeMenu())
        }}
      >
        Удалить
      </button>
    </div>
  )
}
