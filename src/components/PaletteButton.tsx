import { ComponentType, SVGProps } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { setAddingType } from '../features/network/networkSlice'

interface PaletteButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  type: string
}

export default function PaletteButton({ icon: Icon, type }: PaletteButtonProps) {
  const dispatch = useAppDispatch()
  const addingType = useAppSelector(state => state.network.addingType)
  const active = addingType === type

  return (
    <button
      type="button"
      className={`w-10 h-10 flex items-center justify-center rounded ${
        active ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
      }`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/reactflow', type)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => dispatch(setAddingType(active ? null : type))}
    >
      <Icon className="w-6 h-6" />
    </button>
  )
}
