import { useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  closeInterfaces,
  closeNearby,
  select,
} from '../features/network/networkSlice'
import {
  createInterfaceSelectionId,
  directionLabels,
  NodeInterface,
  parseInterfaceSelectionId,
} from '../utils/interfaces'

export default function InterfacesPopup() {
  const dispatch = useAppDispatch()
  const { interfacePopup, nodes, selectedId } = useAppSelector(
    state => state.network
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        dispatch(closeInterfaces())
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dispatch])

  useEffect(() => {
    if (!interfacePopup) return
    const exists = nodes.some(node => node.id === interfacePopup.nodeId)
    if (!exists) dispatch(closeInterfaces())
  }, [dispatch, interfacePopup, nodes])

  const selection = useMemo(
    () => parseInterfaceSelectionId(selectedId),
    [selectedId]
  )

  if (!interfacePopup) return null

  const node = nodes.find(n => n.id === interfacePopup.nodeId)
  if (!node) return null

  const interfaces = Array.isArray(node.data?.interfaces)
    ? (node.data!.interfaces as NodeInterface[])
    : []

  const width = 280
  const leftBoundary = 80
  const rightBoundary = window.innerWidth - (selectedId ? 320 : 0)
  let left = interfacePopup.x
  let top = interfacePopup.y
  if (left + width > rightBoundary) left = rightBoundary - width - 10
  if (left < leftBoundary) left = leftBoundary + 10
  if (top < 60) top = 60

  const nodeLabel = node.data?.label ? String(node.data.label) : node.id

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', left, top, width }}
      className="bg-white border rounded shadow z-50 text-sm"
      onClick={event => event.stopPropagation()}
    >
      <div className="px-3 py-2 border-b font-semibold">
        Интерфейсы узла {nodeLabel}
      </div>
      <div className="max-h-60 overflow-y-auto divide-y">
        {interfaces.length === 0 && (
          <div className="px-3 py-2 text-gray-500">Интерфейсы отсутствуют</div>
        )}
        {interfaces.map(iface => {
          const active =
            selection &&
            selection.nodeId === node.id &&
            selection.interfaceId === iface.id
          return (
            <button
              key={iface.id}
              type="button"
              onClick={() => {
                dispatch(
                  select(createInterfaceSelectionId(node.id, iface.id))
                )
                dispatch(closeNearby())
                dispatch(closeInterfaces())
              }}
              className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${
                active ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium">{iface.name}</div>
              <div className="text-xs text-gray-500">
                {directionLabels[iface.direction]} • {iface.connectedNodeLabel}
              </div>
            </button>
          )
        })}
      </div>
      <div className="border-t flex justify-end">
        <button
          type="button"
          className="px-3 py-1 text-sm"
          onClick={() => dispatch(closeInterfaces())}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
