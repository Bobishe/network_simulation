import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { useAppDispatch, useAppSelector } from '../hooks'
import { SVGProps, useCallback, useEffect, useRef, useState } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import classNames from 'classnames'
import LinkIcon from '../img/link.png'
import { setAddingType, setAutosave } from '../features/network/networkSlice'
import GPSSModal from './GPSSModal'

interface ApiResult {
  success: boolean
  message: string
  filename?: string
}

function FloppyDiskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.414a2 2 0 0 0-.586-1.414l-4.414-4.414A2 2 0 0 0 15.586 2H4zm0 2h11.586L20 8.414V20H16v-6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6H4V4zm4 0v4h6V4H8zm2 10h4v6h-4v-6z" />
    </svg>
  )
}

export default function TopBar() {
  const dispatch = useAppDispatch()
  const { showNotification } = useNotification()
  const { nodes, edges, model, gpss, topologyId, addingType, autosaveEnabled } = useAppSelector(
    state => state.network
  )
  const [showGPSSModal, setShowGPSSModal] = useState(false)
  const [apiResult, setApiResult] = useState<ApiResult | null>(null)
  const isInitialMount = useRef(true)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      showNotification('Сохранено', 'success')
    } else {
      showNotification('Ошибка сохранения', 'error')
    }
  }, [topologyId, nodes, edges, model, gpss, showNotification])

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

  // Автосохранение при изменениях
  useEffect(() => {
    // Пропускаем начальную загрузку
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!autosaveEnabled || topologyId === null) {
      return
    }

    // Отменяем предыдущий таймер
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounce: сохраняем через 1 секунду после последнего изменения
    debounceTimer.current = setTimeout(() => {
      handleSave()
    }, 1000)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [nodes, edges, model, gpss, autosaveEnabled, topologyId, handleSave])

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-12 bg-white border-b flex items-center px-2 z-20">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={autosaveEnabled}
                onChange={e => dispatch(setAutosave(e.target.checked))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-gray-700">Автосохранение</span>
          </label>
          <button
            type="button"
            onClick={() => dispatch(setAddingType(addingType === 'link' ? null : 'link'))}
            title={addingType === 'link' ? 'Выключить режим создания каналов' : 'Включить режим создания каналов'}
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
      {showGPSSModal && (
        <GPSSModal
          onClose={() => setShowGPSSModal(false)}
          onApiResult={setApiResult}
        />
      )}
      {apiResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setApiResult(null)}
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              {apiResult.success ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-semibold">
                {apiResult.success ? 'Успех' : 'Ошибка'}
              </h3>
            </div>
            <p className="text-gray-600 mb-2">{apiResult.message}</p>
            {apiResult.filename && (
              <p className="text-sm text-gray-500">Файл: {apiResult.filename}</p>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setApiResult(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
