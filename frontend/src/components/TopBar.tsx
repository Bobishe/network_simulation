import PaletteButton from './PaletteButton'
import { TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid'
import { useAppSelector } from '../hooks'
import { useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function TopBar() {
  const { nodes, edges, topologyId } = useAppSelector(state => state.network)

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

  const handleSave = useCallback(async () => {
    if (topologyId === null) return
    const res = await fetch(`/api/topologies/${topologyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { nodes, edges } }),
    })
    if (res.ok) {
      toast.success('Сохранено')
    } else {
      toast.error('Ошибка сохранения')
    }
  }, [topologyId, nodes, edges])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  return (
    <div className="fixed top-0 left-0 w-full h-12 bg-white border-b flex items-center justify-between px-2 z-20">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          title="Сохранить топологию"
          className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200"
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          title="Скачать топологию"
          className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>
      </div>
      <PaletteButton icon={TrashIcon} label="Удалить" type="delete" />
    </div>
  )
}
