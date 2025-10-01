import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { useAppDispatch, useAppSelector } from '../hooks'
import { SVGProps, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import classNames from 'classnames'
import LinkIcon from '../img/link.png'
import { setAddingType } from '../features/network/networkSlice'
import GPSSModal from './GPSSModal'

function FloppyDiskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.414a2 2 0 0 0-.586-1.414l-4.414-4.414A2 2 0 0 0 15.586 2H4zm0 2h11.586L20 8.414V20H16v-6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6H4V4zm4 0v4h6V4H8zm2 10h4v6h-4v-6z" />
    </svg>
  )
}

export default function TopBar() {
  const dispatch = useAppDispatch()
  const { nodes, edges, model, gpss, topologyId, addingType } = useAppSelector(
    state => state.network
  )
  const [showGPSSModal, setShowGPSSModal] = useState(false)

  const handleDownload = () => {
    const json = JSON.stringify({ model, nodes, edges, gpss }, null, 2)
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
      body: JSON.stringify({ data: { model, nodes, edges, gpss } }),
    })
    if (res.ok) {
      toast.success('Сохранено')
    } else {
      toast.error('Ошибка сохранения')
    }
  }, [topologyId, nodes, edges, model, gpss])

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
    <>
      <div className="fixed top-0 left-0 w-full h-12 bg-white border-b flex items-center px-2 z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(setAddingType(addingType === 'link' ? null : 'link'))}
            title="Связь"
            className={classNames(
              'flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200 border-2',
              addingType === 'link' ? 'border-blue-500' : 'border-transparent'
            )}
          >
            <img src={LinkIcon} alt="Связь" className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleSave}
            title="Сохранить топологию"
            className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 hover:bg-gray-200"
          >
            <FloppyDiskIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowGPSSModal(true)}
            title="Настройка GPSS"
            className="flex items-center justify-center px-4 h-10 rounded bg-gray-100 hover:bg-gray-200 font-semibold"
          >
            GPSS
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
      </div>
      {showGPSSModal && <GPSSModal onClose={() => setShowGPSSModal(false)} />}
    </>
  )
}
