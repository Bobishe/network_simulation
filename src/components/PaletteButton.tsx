import { ComponentType, SVGProps } from 'react'
import classNames from 'classnames'
import { useAppDispatch, useAppSelector } from '../hooks'
import { setAddingType } from '../features/network/networkSlice'

interface PaletteButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  type: string
  ring?: boolean
}

export default function PaletteButton({ icon: Icon, label, type, ring }: PaletteButtonProps) {
  const dispatch = useAppDispatch()
  const addingType = useAppSelector(state => state.network.addingType)
  const active = addingType === type

  return (
    <button
      type="button"
      title={label}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/reactflow', type)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => dispatch(setAddingType(active ? null : type))}
      className={classNames(
        'flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200 mr-2',
        { 'bg-blue-500 text-white': active }
      )}
    >
      <span className="relative">
        <Icon className="w-5 h-5 pointer-events-none" />
        {ring && <span className="absolute inset-0 rounded-full ring-2 ring-current" />}
      </span>
    </button>
  )
}
