import PaletteButton from './PaletteButton'
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { useAppSelector } from '../hooks'

export default function TopBar() {
  const { nodes, edges } = useAppSelector(state => state.network)

  const handleDownload = () => {
    const json = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'topology.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed top-0 left-0 w-full h-12 bg-white border-b flex items-center justify-between px-2 z-20">
      <button
        type="button"
        onClick={handleDownload}
        title="Download topology"
        className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
      </button>
      <PaletteButton icon={TrashIcon} label="DEL" type="delete" />
    </div>
  )
}
