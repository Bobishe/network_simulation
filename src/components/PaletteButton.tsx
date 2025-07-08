import { ComponentType } from 'react'

interface Props {
  icon: ComponentType<{ className?: string }>
  active?: boolean
  onClick?: () => void
}

export const PaletteButton = ({ icon: Icon, active, ...rest }: Props) => (
  <button
    {...rest}
    className={`w-10 h-10 flex items-center justify-center rounded
                ${active ? 'bg-blue-500 text-white'
                         : 'bg-gray-100 hover:bg-gray-200'}`}
  >
    <Icon className="w-6 h-6" />
  </button>
)
