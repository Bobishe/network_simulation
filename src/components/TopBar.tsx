import PaletteButton from './PaletteButton'
import { TrashIcon } from '@heroicons/react/24/solid'

export default function TopBar() {
  return (
    <div className="fixed top-0 left-0 w-full h-12 bg-white border-b flex items-center px-2 z-20">
      <PaletteButton icon={TrashIcon} label="DEL" type="delete" />
    </div>
  )
}
